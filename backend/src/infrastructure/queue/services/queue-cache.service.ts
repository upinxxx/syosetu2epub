import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import {
  QueueCachePort,
  JobStatusCache,
} from '@/domain/ports/queue/queue-cache.port.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * 佇列緩存服務
 * 負責任務狀態緩存管理，實作終態保護邏輯防止競態條件
 * 提供批量操作和自動過期管理功能
 */
@Injectable()
export class QueueCacheService implements QueueCachePort {
  private readonly logger = new Logger(QueueCacheService.name);

  // 緩存過期時間配置（秒）
  private readonly DEFAULT_CACHE_EXPIRY = {
    [JobStatus.COMPLETED]: 24 * 60 * 60, // 完成任務 24 小時
    [JobStatus.FAILED]: 7 * 24 * 60 * 60, // 失敗任務 7 天
    [JobStatus.PROCESSING]: 60 * 60, // 處理中任務 1 小時
    [JobStatus.QUEUED]: 60 * 60, // 等待中任務 1 小時
  };

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {
    this.logger.log('佇列緩存服務已初始化');
  }

  /**
   * 緩存任務狀態（含終態保護）
   */
  async cacheJobStatus(
    queueName: string,
    jobId: string,
    statusData: Partial<JobStatusCache>,
    expireSeconds?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(queueName, jobId);

      // 檢查現有狀態，實施終態保護
      const existing = await this.getCachedJobStatus(queueName, jobId);

      if (existing && this.isTerminalState(existing.status)) {
        // 終態保護：已完成或失敗的任務不可被覆蓋為其他狀態
        if (statusData.status && !this.isTerminalState(statusData.status)) {
          this.logger.warn(
            `拒絕覆蓋終態狀態: ${queueName}/${jobId} (${existing.status} -> ${statusData.status})`,
          );
          return;
        }
      }

      // 合併現有數據和新數據
      const mergedData: JobStatusCache = {
        jobId,
        status: statusData.status || existing?.status || JobStatus.QUEUED,
        updatedAt: new Date(),
        ...existing,
        ...statusData,
      };

      // 設置緩存過期時間
      const cacheExpiry =
        expireSeconds || this.getCacheExpiry(mergedData.status);

      await this.redis.setex(
        cacheKey,
        cacheExpiry,
        JSON.stringify(mergedData, this.dateReplacer),
      );

      this.logger.debug(
        `已緩存任務狀態: ${queueName}/${jobId} (${mergedData.status}, 過期時間: ${cacheExpiry}s)`,
      );
    } catch (error) {
      this.logger.error(
        `緩存任務狀態失敗: ${queueName}/${jobId} - ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 獲取緩存的任務狀態
   */
  async getCachedJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatusCache | null> {
    try {
      const cacheKey = this.buildCacheKey(queueName, jobId);
      const cached = await this.redis.get(cacheKey);

      if (!cached) {
        this.logger.debug(`未找到緩存的任務狀態: ${queueName}/${jobId}`);
        return null;
      }

      const data = JSON.parse(cached, this.dateReviver) as JobStatusCache;
      this.logger.debug(
        `獲取緩存的任務狀態: ${queueName}/${jobId} (${data.status})`,
      );

      return data;
    } catch (error) {
      this.logger.error(
        `獲取緩存任務狀態失敗: ${queueName}/${jobId} - ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * 刪除緩存的任務狀態
   */
  async removeCachedJobStatus(queueName: string, jobId: string): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(queueName, jobId);
      const deleted = await this.redis.del(cacheKey);

      if (deleted > 0) {
        this.logger.log(`已刪除緩存的任務狀態: ${queueName}/${jobId}`);
      } else {
        this.logger.debug(`緩存不存在，無需刪除: ${queueName}/${jobId}`);
      }
    } catch (error) {
      this.logger.error(
        `刪除緩存任務狀態失敗: ${queueName}/${jobId} - ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 檢查狀態是否為終態
   */
  isTerminalState(status: JobStatus): boolean {
    return status === JobStatus.COMPLETED || status === JobStatus.FAILED;
  }

  /**
   * 批量獲取緩存狀態
   */
  async batchGetCachedJobStatus(
    queueName: string,
    jobIds: string[],
  ): Promise<Map<string, JobStatusCache>> {
    const result = new Map<string, JobStatusCache>();

    if (jobIds.length === 0) {
      return result;
    }

    try {
      const cacheKeys = jobIds.map((jobId) =>
        this.buildCacheKey(queueName, jobId),
      );
      const cachedValues = await this.redis.mget(...cacheKeys);

      for (let i = 0; i < jobIds.length; i++) {
        const jobId = jobIds[i];
        const cached = cachedValues[i];

        if (cached) {
          try {
            const data = JSON.parse(cached, this.dateReviver) as JobStatusCache;
            result.set(jobId, data);
          } catch (parseError) {
            this.logger.warn(`解析緩存數據失敗: ${queueName}/${jobId}`);
          }
        }
      }

      this.logger.debug(
        `批量獲取緩存狀態: ${queueName} (${result.size}/${jobIds.length})`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `批量獲取緩存狀態失敗: ${queueName} - ${error.message}`,
        error.stack,
      );
      return result;
    }
  }

  /**
   * 清理過期的緩存項目
   */
  async cleanupExpiredCache(queueName: string): Promise<number> {
    try {
      const pattern = this.buildCacheKey(queueName, '*');
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      // Redis的SETEX命令會自動處理過期，這裡主要是統計
      let expiredCount = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          // TTL為-2表示key不存在（已過期），-1表示沒有過期時間
          expiredCount++;
        }
      }

      this.logger.log(
        `緩存清理完成: ${queueName} (發現 ${expiredCount} 個過期項目)`,
      );
      return expiredCount;
    } catch (error) {
      this.logger.error(
        `清理過期緩存失敗: ${queueName} - ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * 建構緩存鍵名
   * @private
   */
  private buildCacheKey(queueName: string, jobId: string): string {
    return `queue:${queueName}:job:${jobId}:status`;
  }

  /**
   * 獲取狀態對應的緩存過期時間
   * @private
   */
  private getCacheExpiry(status: JobStatus): number {
    return this.DEFAULT_CACHE_EXPIRY[status] || 60 * 60; // 默認1小時
  }

  /**
   * JSON序列化時的Date處理
   * @private
   */
  private dateReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  /**
   * JSON反序列化時的Date處理
   * @private
   */
  private dateReviver(key: string, value: any): any {
    if (value && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QueuePort,
  JobData,
  JobOptions,
  JobStatusCache,
} from '@/domain/ports/queue.port.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * 隊列服務 - QueuePort 的實現
 * 統一管理所有隊列操作
 */
@Injectable()
export class QueueAdapter implements QueuePort {
  private readonly logger = new Logger(QueueAdapter.name);
  private readonly queues: Map<string, Queue>;
  private readonly DEFAULT_CACHE_EXPIRY = 86400; // 預設緩存過期時間：1 天（秒）

  constructor(
    @InjectQueue('epub')
    private readonly epubQueue: Queue,
    @InjectQueue('preview')
    private readonly previewQueue: Queue,
    @InjectQueue('kindle-delivery')
    private readonly kindleDeliveryQueue: Queue,
  ) {
    // 初始化隊列映射
    this.queues = new Map<string, Queue>();
    this.queues.set('epub', epubQueue);
    this.queues.set('preview', previewQueue);
    this.queues.set('kindle-delivery', kindleDeliveryQueue);
  }

  /**
   * 添加任務到隊列
   * @param queueName 隊列名稱
   * @param data 任務數據
   * @param options 任務選項
   * @returns 任務 ID
   */
  async addJob<T extends JobData>(
    queueName: string,
    data: T,
    options?: JobOptions,
  ): Promise<string> {
    try {
      const queue = this.getQueue(queueName);
      this.logger.log(`添加任務到 ${queueName} 隊列: ${JSON.stringify(data)}`);

      // 設置默認選項
      const defaultOptions = {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        ...options,
      };

      // 根據隊列名稱添加不同的 jobName 前綴
      const jobName = `${queueName}-job`;
      const job = await queue.add(jobName, data, defaultOptions);

      // 確保返回字串類型的 job.id
      const jobId = job.id;
      this.logger.log(`任務已添加到 ${queueName} 隊列: ${jobId}`);

      // 緩存初始任務狀態
      if (jobId) {
        await this.cacheJobStatus(queueName, jobId.toString(), {
          jobId: jobId.toString(),
          status: JobStatus.QUEUED,
          updatedAt: new Date(),
          data: data, // 存儲原始任務數據
        });
      }

      return jobId ? jobId.toString() : '';
    } catch (error) {
      this.logger.error(
        `添加任務到 ${queueName} 隊列失敗: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 獲取任務狀態
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @returns 任務狀態
   */
  async getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatus | undefined> {
    try {
      // 首先嘗試從緩存中獲取任務狀態
      const cachedStatus = await this.getCachedJobStatus(queueName, jobId);
      if (cachedStatus) {
        return cachedStatus.status as JobStatus;
      }

      // 如果緩存中沒有，則從隊列中獲取
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        return JobStatus.FAILED;
      }

      // 獲取任務狀態
      try {
        const state = await job.getState();
        let status: JobStatus;

        // 將 BullMQ 狀態映射到我們的 JobStatus 枚舉
        switch (state) {
          case 'completed':
            status = JobStatus.COMPLETED;
            break;
          case 'failed':
            status = JobStatus.FAILED;
            break;
          case 'active':
            status = JobStatus.PROCESSING;
            break;
          case 'waiting':
          case 'delayed':
          case 'prioritized':
            status = JobStatus.QUEUED;
            break;
          default:
            this.logger.warn(`未知的任務狀態: ${state}`);
            status = JobStatus.QUEUED; // 預設為排隊中
        }

        // 更新緩存
        await this.cacheJobStatus(queueName, jobId, {
          jobId,
          status,
          updatedAt: new Date(),
        });

        return status;
      } catch (stateError) {
        this.logger.warn(`無法獲取任務 ${jobId} 狀態: ${stateError.message}`);
        return JobStatus.FAILED;
      }
    } catch (error) {
      this.logger.error(
        `獲取任務 ${jobId} 狀態失敗: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 取消任務
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (job) {
        await job.remove();
        // 同時刪除緩存
        await this.removeCachedJobStatus(queueName, jobId);
        this.logger.log(`已從 ${queueName} 隊列移除任務 ${jobId}`);
      } else {
        this.logger.warn(`找不到要移除的任務 ${jobId}`);
      }
    } catch (error) {
      this.logger.error(
        `移除任務 ${jobId} 失敗: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 緩存任務狀態
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @param statusData 任務狀態數據
   * @param expireSeconds 緩存過期時間（秒）
   */
  async cacheJobStatus(
    queueName: string,
    jobId: string,
    statusData: Partial<JobStatusCache>,
    expireSeconds: number = this.DEFAULT_CACHE_EXPIRY,
  ): Promise<void> {
    try {
      const redisClient = await this.getRedisClient(queueName);

      // 構建 Redis 緩存 key
      const cacheKey = this.buildJobCacheKey(queueName, jobId);

      // 確保更新時間存在
      if (!statusData.updatedAt) {
        statusData.updatedAt = new Date();
      }

      // 先檢查是否已有緩存數據
      const existingJson = await redisClient.get(cacheKey);
      let mergedData: JobStatusCache;

      if (existingJson) {
        try {
          // 合併現有緩存數據與新數據
          const existingData = JSON.parse(existingJson) as JobStatusCache;
          mergedData = { ...existingData, ...statusData };
        } catch (parseError) {
          // 解析錯誤，使用新數據
          this.logger.warn(`解析緩存數據失敗: ${parseError.message}`);
          mergedData = statusData as JobStatusCache;
        }
      } else {
        // 沒有現有緩存，使用新數據
        mergedData = statusData as JobStatusCache;
      }

      // 將日期對象轉換為 ISO 字符串
      const serializedData = JSON.stringify(mergedData, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });

      // 設置緩存並指定過期時間
      await redisClient.set(cacheKey, serializedData, 'EX', expireSeconds);

      this.logger.debug(`已緩存任務 ${jobId} 狀態數據`);
    } catch (error) {
      this.logger.error(
        `緩存任務 ${jobId} 狀態失敗: ${error.message}`,
        error.stack,
      );
      // 緩存失敗不應中斷主流程，所以僅記錄錯誤而不拋出
    }
  }

  /**
   * 獲取緩存的任務狀態
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @returns 緩存的任務狀態數據，如果不存在則返回 null
   */
  async getCachedJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatusCache | null> {
    try {
      const redisClient = await this.getRedisClient(queueName);

      // 構建 Redis 緩存 key
      const cacheKey = this.buildJobCacheKey(queueName, jobId);

      // 從 Redis 獲取緩存數據
      const cachedJson = await redisClient.get(cacheKey);

      if (!cachedJson) {
        return null;
      }

      try {
        // 解析 JSON 並轉換日期字符串為 Date 對象
        const cachedData = JSON.parse(cachedJson, (key, value) => {
          if (
            typeof value === 'string' &&
            (key === 'updatedAt' ||
              key === 'startedAt' ||
              key === 'completedAt') &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
          ) {
            return new Date(value);
          }
          return value;
        }) as JobStatusCache;

        return cachedData;
      } catch (parseError) {
        this.logger.warn(`解析緩存數據失敗: ${parseError.message}`);
        return null;
      }
    } catch (error) {
      this.logger.error(
        `獲取任務 ${jobId} 緩存狀態失敗: ${error.message}`,
        error.stack,
      );
      // 緩存獲取失敗不應中斷主流程，所以返回 null
      return null;
    }
  }

  /**
   * 刪除緩存的任務狀態
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   */
  async removeCachedJobStatus(queueName: string, jobId: string): Promise<void> {
    try {
      const redisClient = await this.getRedisClient(queueName);

      // 構建 Redis 緩存 key
      const cacheKey = this.buildJobCacheKey(queueName, jobId);

      // 刪除緩存
      await redisClient.del(cacheKey);

      this.logger.debug(`已刪除任務 ${jobId} 緩存狀態`);
    } catch (error) {
      this.logger.error(
        `刪除任務 ${jobId} 緩存狀態失敗: ${error.message}`,
        error.stack,
      );
      // 緩存刪除失敗不應中斷主流程，所以僅記錄錯誤而不拋出
    }
  }

  /**
   * 獲取任務數據
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @returns 任務數據，如果不存在則返回 null
   */
  async getJobData(queueName: string, jobId: string): Promise<JobData | null> {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        this.logger.warn(`找不到任務 ${jobId} 的數據`);
        return null;
      }

      // 檢查任務數據的完整性
      if (!job.data) {
        this.logger.warn(`任務 ${jobId} 數據為空`);
        return null;
      }

      // 記錄完整的任務數據以便調試
      this.logger.debug(`獲取任務 ${jobId} 數據: ${JSON.stringify(job.data)}`);

      // 檢查數據是否包含必要字段
      if (queueName === 'preview' && (!job.data.source || !job.data.sourceId)) {
        this.logger.warn(
          `任務 ${jobId} 數據缺少必要字段: ${JSON.stringify(job.data)}`,
        );
      }

      return job.data;
    } catch (error) {
      this.logger.error(
        `獲取任務 ${jobId} 數據失敗: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * 獲取隊列實例
   * @private
   */
  private getQueue(queueName: string): Queue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`未注冊的隊列: ${queueName}`);
    }
    return queue;
  }

  /**
   * 獲取 Redis 客戶端
   * @private
   */
  private async getRedisClient(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);
    // BullMQ 的 Queue.client 屬性是 Promise<RedisClient>
    // 使用 any 類型避免類型兼容性問題
    return await queue.client;
  }

  /**
   * 構建任務緩存 key
   * @private
   */
  private buildJobCacheKey(queueName: string, jobId: string): string {
    return `job:${queueName}:${jobId}:status`;
  }
}

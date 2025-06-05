import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueuePort, JobData, JobOptions } from '@/domain/ports/queue.port.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';
import { QueueCoreService } from './services/queue-core.service.js';
import { QueueCacheService } from './services/queue-cache.service.js';
import { QueueEventHandler } from './services/queue-event.handler.js';
import { QueueHealthService } from './services/queue-health.service.js';
import { JobStatusCache } from '@/domain/ports/queue.port.js';

/**
 * 佇列適配器兼容層
 * 提供向後兼容的QueuePort介面，內部委託到新的模組化服務
 * 確保現有的Facade和Controller無需修改
 */
@Injectable()
export class QueueAdapter implements QueuePort {
  private readonly logger = new Logger(QueueAdapter.name);

  constructor(
    @Inject(QueueCoreService)
    private readonly coreService: QueueCoreService,
    @Inject(QueueCacheService)
    private readonly cacheService: QueueCacheService,
    @Inject(QueueEventHandler)
    private readonly eventHandler: QueueEventHandler,
    @Inject(QueueHealthService)
    private readonly healthService: QueueHealthService,
  ) {
    this.logger.log('佇列適配器兼容層已初始化');
  }

  /**
   * 添加任務到隊列
   */
  async addJob<T extends JobData>(
    queueName: string,
    data: T,
    options?: JobOptions,
  ): Promise<string> {
    const jobId = await this.coreService.addJob(queueName, data, options);

    // 緩存初始狀態
    await this.cacheService.cacheJobStatus(queueName, jobId, {
      jobId,
      status: JobStatus.QUEUED,
      updatedAt: new Date(),
      userId: (data as any)?.userId || null,
      data,
    });

    return jobId;
  }

  /**
   * 獲取任務狀態（優先從緩存獲取）
   */
  async getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatus | undefined> {
    try {
      // 優先從緩存獲取
      const cached = await this.cacheService.getCachedJobStatus(
        queueName,
        jobId,
      );
      if (cached) {
        return cached.status;
      }

      // 緩存未命中，從BullMQ獲取
      const status = await this.coreService.getJobStatus(queueName, jobId);

      // 更新緩存
      if (status) {
        await this.cacheService.cacheJobStatus(queueName, jobId, {
          jobId,
          status,
          updatedAt: new Date(),
        });
      }

      return status;
    } catch (error) {
      this.logger.error(
        `獲取任務狀態失敗: ${queueName}/${jobId} - ${error.message}`,
      );
      return JobStatus.FAILED;
    }
  }

  /**
   * 移除任務
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    await this.coreService.removeJob(queueName, jobId);
    await this.cacheService.removeCachedJobStatus(queueName, jobId);
  }

  /**
   * 獲取任務數據
   */
  async getJobData(queueName: string, jobId: string): Promise<JobData | null> {
    return this.coreService.getJobData(queueName, jobId);
  }

  /**
   * 緩存任務狀態
   */
  async cacheJobStatus(
    queueName: string,
    jobId: string,
    statusData: Partial<JobStatusCache>,
    expireSeconds?: number,
    preview?: any,
  ): Promise<void> {
    // 如果有預覽數據，添加到狀態數據中
    if (preview) {
      statusData.previewData = preview;
    }

    await this.cacheService.cacheJobStatus(
      queueName,
      jobId,
      statusData,
      expireSeconds,
    );
  }

  /**
   * 獲取緩存的任務狀態
   */
  async getCachedJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatusCache | null> {
    return this.cacheService.getCachedJobStatus(queueName, jobId);
  }

  /**
   * 刪除緩存的任務狀態
   */
  async removeCachedJobStatus(queueName: string, jobId: string): Promise<void> {
    await this.cacheService.removeCachedJobStatus(queueName, jobId);
  }

  /**
   * 手動同步任務狀態
   */
  async manualSyncJob(queueName: string, jobId: string): Promise<void> {
    try {
      // 從BullMQ獲取最新狀態
      const status = await this.coreService.getJobStatus(queueName, jobId);
      const data = await this.coreService.getJobData(queueName, jobId);

      if (status) {
        // 更新緩存
        await this.cacheService.cacheJobStatus(queueName, jobId, {
          jobId,
          status,
          updatedAt: new Date(),
          data: data || undefined,
        });

        this.logger.log(
          `手動同步任務狀態完成: ${queueName}/${jobId} -> ${status}`,
        );
      } else {
        this.logger.warn(`無法獲取任務狀態進行同步: ${queueName}/${jobId}`);
      }
    } catch (error) {
      this.logger.error(
        `手動同步任務狀態失敗: ${queueName}/${jobId} - ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 獲取任務詳細狀態（包含緩存數據）
   */
  async getJobStatusWithDetails(
    queueName: string,
    jobId: string,
  ): Promise<any> {
    const cached = await this.cacheService.getCachedJobStatus(queueName, jobId);
    if (cached) {
      return {
        jobId: cached.jobId,
        status: cached.status,
        startedAt: cached.startedAt,
        completedAt: cached.completedAt,
        publicUrl: cached.publicUrl,
        errorMessage: cached.errorMessage,
        updatedAt: cached.updatedAt,
        userId: cached.userId,
        previewData: cached.previewData,
        data: cached.data,
      };
    }

    // 如果緩存中沒有，嘗試從BullMQ獲取基本狀態
    const status = await this.coreService.getJobStatus(queueName, jobId);
    const data = await this.coreService.getJobData(queueName, jobId);

    return {
      jobId,
      status: status || JobStatus.FAILED,
      updatedAt: new Date(),
      data,
    };
  }

  /**
   * 批量獲取任務狀態
   */
  async batchGetJobStatus(
    queueName: string,
    jobIds: string[],
  ): Promise<Map<string, JobStatus>> {
    const result = new Map<string, JobStatus>();
    const cached = await this.cacheService.batchGetCachedJobStatus(
      queueName,
      jobIds,
    );

    for (const jobId of jobIds) {
      const cachedData = cached.get(jobId);
      if (cachedData) {
        result.set(jobId, cachedData.status);
      } else {
        // 緩存未命中，從BullMQ獲取
        try {
          const status = await this.coreService.getJobStatus(queueName, jobId);
          if (status) {
            result.set(jobId, status);
            // 更新緩存
            await this.cacheService.cacheJobStatus(queueName, jobId, {
              jobId,
              status,
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          this.logger.warn(`獲取任務 ${jobId} 狀態失敗: ${error.message}`);
          result.set(jobId, JobStatus.FAILED);
        }
      }
    }

    return result;
  }

  /**
   * 健康檢查
   */
  async healthCheck(): Promise<any> {
    return this.healthService.performHealthCheck();
  }

  /**
   * 恢復失敗任務
   */
  async recoverFailedJobs(queueName?: string): Promise<number> {
    return this.healthService.recoverFailedJobs(queueName);
  }

  /**
   * 獲取隊列指標
   */
  async getQueueMetrics(queueName: string): Promise<any> {
    return this.healthService.getQueueMetrics(queueName);
  }

  /**
   * 清理卡住的任務
   */
  async cleanupStalledJobs(queueName: string): Promise<number> {
    return this.healthService.cleanupStalledJobs(queueName, 1); // 1小時
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
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
  private readonly queueEvents: Map<string, QueueEvents>;
  private readonly DEFAULT_CACHE_EXPIRY = 86400; // 預設緩存過期時間：1 天（秒）

  // 🆕 事件監聽器容錯機制相關屬性
  private readonly eventErrorCounts = new Map<string, number>(); // 追蹤事件錯誤次數
  private readonly maxEventErrors = 10; // 最大事件錯誤次數
  private readonly eventErrorResetInterval = 300000; // 5分鐘重置錯誤計數
  private readonly syncFailureJobs = new Set<string>(); // 追蹤同步失敗的任務

  constructor(
    @InjectQueue('epub')
    private readonly epubQueue: Queue,
    @InjectQueue('preview')
    private readonly previewQueue: Queue,
    @InjectQueue('kindle-delivery')
    private readonly kindleDeliveryQueue: Queue,
    @InjectQueue('conversion')
    private readonly conversionQueue: Queue,
    @InjectQueue('health')
    private readonly healthQueue: Queue,
  ) {
    // 初始化隊列映射
    this.queues = new Map<string, Queue>();
    this.queues.set('epub', epubQueue);
    this.queues.set('preview', previewQueue);
    this.queues.set('kindle-delivery', kindleDeliveryQueue);
    this.queues.set('conversion', conversionQueue);
    this.queues.set('health', healthQueue);
    // 初始化 QueueEvents 映射
    this.queueEvents = new Map<string, QueueEvents>();

    // 🔑 設置佇列事件監聽器以實現即時狀態同步
    this.setupQueueEventListeners();
  }

  /**
   * 🔑 設置佇列事件監聽器
   * 實現佇列狀態變化的即時同步到緩存
   * @private
   */
  private setupQueueEventListeners(): void {
    // 為每個佇列設置事件監聽器
    this.queues.forEach((queue, queueName) => {
      this.logger.log(`設置 ${queueName} 佇列事件監聽器`);

      try {
        // 創建 QueueEvents 實例來監聽全局事件
        const queueEvents = new QueueEvents(queueName, {
          connection: queue.opts.connection,
        });

        this.queueEvents.set(queueName, queueEvents);

        // 🆕 監聽連接錯誤事件
        queueEvents.on('error', (error) => {
          this.handleEventError(queueName, 'connection', error);
        });

        // 監聽任務完成事件
        queueEvents.on('completed', async ({ jobId }) => {
          try {
            // 🆕 延遲同步以避免競爭條件
            setTimeout(async () => {
              try {
                await this.syncJobStatusFromQueue(queueName, jobId);
                this.logger.debug(`佇列事件：任務 ${jobId} 完成`);
                // 🆕 從失敗追蹤中移除
                this.syncFailureJobs.delete(`${queueName}:${jobId}`);
              } catch (error) {
                this.handleEventError(queueName, 'completed', error, jobId);
              }
            }, 100); // 延遲 100ms
          } catch (error) {
            this.handleEventError(queueName, 'completed', error, jobId);
          }
        });

        // 監聽任務失敗事件
        queueEvents.on('failed', async ({ jobId, failedReason }) => {
          try {
            // 🆕 延遲同步以避免競爭條件
            setTimeout(async () => {
              try {
                await this.syncJobStatusFromQueue(queueName, jobId);
                this.logger.debug(
                  `佇列事件：任務 ${jobId} 失敗 - ${failedReason}`,
                );
                // 🆕 從失敗追蹤中移除
                this.syncFailureJobs.delete(`${queueName}:${jobId}`);
              } catch (error) {
                this.handleEventError(queueName, 'failed', error, jobId);
              }
            }, 100); // 延遲 100ms
          } catch (error) {
            this.handleEventError(queueName, 'failed', error, jobId);
          }
        });

        // 監聽任務開始處理事件
        queueEvents.on('active', async ({ jobId }) => {
          try {
            // 🔑 關鍵修復：檢查緩存中是否已有終態狀態
            const cachedStatus = await this.getCachedJobStatus(
              queueName,
              jobId,
            );
            if (
              cachedStatus &&
              (cachedStatus.status === JobStatus.COMPLETED ||
                cachedStatus.status === JobStatus.FAILED)
            ) {
              this.logger.debug(
                `任務 ${jobId} 已完成（${cachedStatus.status}），跳過 active 事件同步`,
              );
              return;
            }

            // 🆕 延遲同步以避免競爭條件
            setTimeout(async () => {
              try {
                // 🔑 再次檢查以防競態條件
                const currentStatus = await this.getCachedJobStatus(
                  queueName,
                  jobId,
                );
                if (
                  currentStatus &&
                  (currentStatus.status === JobStatus.COMPLETED ||
                    currentStatus.status === JobStatus.FAILED)
                ) {
                  this.logger.debug(
                    `任務 ${jobId} 在延遲期間已完成（${currentStatus.status}），跳過同步`,
                  );
                  return;
                }

                await this.syncJobStatusFromQueue(queueName, jobId);
                this.logger.debug(`佇列事件：任務 ${jobId} 開始處理`);
                // 🆕 從失敗追蹤中移除
                this.syncFailureJobs.delete(`${queueName}:${jobId}`);
              } catch (error) {
                this.handleEventError(queueName, 'active', error, jobId);
              }
            }, 50); // 較短延遲 50ms
          } catch (error) {
            this.handleEventError(queueName, 'active', error, jobId);
          }
        });

        // 監聽任務停滯事件
        queueEvents.on('stalled', async ({ jobId }) => {
          try {
            this.logger.warn(`佇列事件：任務 ${jobId} 停滯`);
            await this.syncJobStatusFromQueue(queueName, jobId);
            // 🆕 從失敗追蹤中移除
            this.syncFailureJobs.delete(`${queueName}:${jobId}`);
          } catch (error) {
            this.handleEventError(queueName, 'stalled', error, jobId);
          }
        });

        this.logger.log(`${queueName} 佇列事件監聽器設置完成`);
      } catch (error) {
        this.logger.error(
          `設置 ${queueName} 佇列事件監聽器失敗: ${error.message}`,
        );
      }
    });

    this.logger.log('所有佇列事件監聽器設置完成');

    // 🆕 啟動定期狀態檢查和錯誤恢復
    this.startPeriodicHealthCheck();
  }

  /**
   * 🆕 處理事件錯誤
   * @private
   */
  private handleEventError(
    queueName: string,
    eventType: string,
    error: any,
    jobId?: string,
  ): void {
    const errorKey = `${queueName}:${eventType}`;
    const currentCount = this.eventErrorCounts.get(errorKey) || 0;
    this.eventErrorCounts.set(errorKey, currentCount + 1);

    this.logger.error(
      `佇列事件錯誤 [${queueName}:${eventType}] (第${currentCount + 1}次): ${error.message}`,
      error.stack,
    );

    // 如果有 jobId，加入失敗追蹤
    if (jobId) {
      this.syncFailureJobs.add(`${queueName}:${jobId}`);
      this.logger.warn(`任務 ${jobId} 同步失敗，已加入重試列表`);
    }

    // 如果錯誤次數過多，暫停該事件類型的處理
    if (currentCount >= this.maxEventErrors) {
      this.logger.error(
        `佇列事件 [${queueName}:${eventType}] 錯誤次數過多，將在 ${this.eventErrorResetInterval / 1000} 秒後重置`,
      );

      // 設置重置定時器
      setTimeout(() => {
        this.eventErrorCounts.delete(errorKey);
        this.logger.log(`佇列事件 [${queueName}:${eventType}] 錯誤計數已重置`);
      }, this.eventErrorResetInterval);
    }
  }

  /**
   * 🆕 啟動定期健康檢查
   * @private
   */
  private startPeriodicHealthCheck(): void {
    // 每 2 分鐘執行一次健康檢查
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error(`定期健康檢查失敗: ${error.message}`);
      }
    }, 120000); // 2 分鐘

    this.logger.log('定期健康檢查已啟動');
  }

  /**
   * 🆕 執行健康檢查
   * @private
   */
  private async performHealthCheck(): Promise<void> {
    this.logger.debug('執行佇列健康檢查...');

    // 檢查失敗的同步任務
    if (this.syncFailureJobs.size > 0) {
      this.logger.warn(
        `發現 ${this.syncFailureJobs.size} 個同步失敗的任務，嘗試重新同步`,
      );

      const failedJobs = Array.from(this.syncFailureJobs);
      for (const jobKey of failedJobs) {
        const [queueName, jobId] = jobKey.split(':');
        try {
          await this.manualSyncJob(queueName, jobId);
          this.syncFailureJobs.delete(jobKey);
          this.logger.debug(`手動同步任務 ${jobId} 成功`);
        } catch (error) {
          this.logger.error(`手動同步任務 ${jobId} 失敗: ${error.message}`);
        }
      }
    }

    // 檢查佇列連接狀態
    for (const [queueName, queueEvents] of this.queueEvents) {
      try {
        // 檢查 QueueEvents 連接狀態
        const client = await queueEvents.client;
        if (!client || !client.status || client.status !== 'ready') {
          this.logger.warn(
            `佇列 ${queueName} 事件監聽器連接異常，嘗試重新連接`,
          );
          await this.reconnectQueueEvents(queueName);
        }
      } catch (error) {
        this.logger.error(
          `檢查佇列 ${queueName} 連接狀態失敗: ${error.message}`,
        );
      }
    }

    this.logger.debug('佇列健康檢查完成');
  }

  /**
   * 🆕 手動同步任務狀態
   * @param queueName 佇列名稱
   * @param jobId 任務 ID
   */
  async manualSyncJob(queueName: string, jobId: string): Promise<void> {
    try {
      this.logger.debug(`手動同步任務 ${queueName}:${jobId}`);
      await this.syncJobStatusFromQueue(queueName, jobId);
      this.logger.debug(`手動同步任務 ${queueName}:${jobId} 完成`);
    } catch (error) {
      this.logger.error(
        `手動同步任務 ${queueName}:${jobId} 失敗: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🆕 重新連接佇列事件監聽器
   * @private
   */
  private async reconnectQueueEvents(queueName: string): Promise<void> {
    try {
      const oldQueueEvents = this.queueEvents.get(queueName);
      if (oldQueueEvents) {
        await oldQueueEvents.close();
      }

      // 重新創建 QueueEvents
      const queue = this.getQueue(queueName);
      const newQueueEvents = new QueueEvents(queueName, {
        connection: queue.opts.connection,
      });

      this.queueEvents.set(queueName, newQueueEvents);
      this.logger.log(`佇列 ${queueName} 事件監聽器重新連接成功`);
    } catch (error) {
      this.logger.error(
        `重新連接佇列 ${queueName} 事件監聽器失敗: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🔑 從佇列同步狀態到緩存
   * 確保緩存狀態與佇列實際狀態保持一致
   * @private
   */
  private async syncJobStatusFromQueue(
    queueName: string,
    jobId: string,
    job?: any,
    retryCount: number = 0,
  ): Promise<void> {
    const maxRetries = 3;

    try {
      if (!jobId) {
        this.logger.warn('無效的 jobId，跳過同步');
        return;
      }

      // 🔑 關鍵修復：先檢查緩存中是否已有完成狀態，避免覆蓋
      const cachedStatus = await this.getCachedJobStatus(queueName, jobId);
      if (
        cachedStatus &&
        (cachedStatus.status === JobStatus.COMPLETED ||
          cachedStatus.status === JobStatus.FAILED)
      ) {
        this.logger.debug(
          `任務 ${jobId} 已完成（${cachedStatus.status}），跳過同步以避免狀態覆蓋`,
        );
        return;
      }

      const queue = this.getQueue(queueName);
      let jobInstance = job;

      // 如果沒有提供 job 實例，嘗試從隊列獲取
      if (!jobInstance) {
        try {
          jobInstance = await queue.getJob(jobId);
        } catch (getJobError) {
          this.logger.warn(`獲取任務 ${jobId} 失敗: ${getJobError.message}`);

          // 🔑 如果任務不存在，再次檢查緩存狀態
          if (cachedStatus) {
            this.logger.debug(
              `任務 ${jobId} 不存在於佇列，但緩存中有狀態: ${cachedStatus.status}，保持現有狀態`,
            );
            return;
          }

          // 如果重試次數未達上限，進行重試
          if (retryCount < maxRetries) {
            this.logger.debug(
              `重試同步任務 ${jobId}，重試次數: ${retryCount + 1}`,
            );
            setTimeout(
              () => {
                this.syncJobStatusFromQueue(
                  queueName,
                  jobId,
                  job,
                  retryCount + 1,
                );
              },
              1000 * (retryCount + 1),
            ); // 遞增延遲
            return;
          }

          this.logger.warn(`無法找到任務 ${jobId}，跳過同步`);
          return;
        }
      }

      if (!jobInstance) {
        this.logger.warn(`無法找到任務 ${jobId}，跳過同步`);
        return;
      }

      // 獲取任務狀態
      const state = await jobInstance.getState();

      // 🔑 關鍵修復：如果狀態未知，不要覆蓋現有狀態
      if (!state || state === 'unknown') {
        this.logger.warn(
          `任務 ${jobId} 狀態未知或不存在，跳過同步以避免覆蓋現有狀態`,
        );
        return;
      }

      const mappedStatus = this.mapBullMQStateToJobStatus(state);

      // 🔑 如果映射結果為 null，跳過同步
      if (mappedStatus === null) {
        this.logger.warn(
          `任務 ${jobId} 狀態映射失敗（${state}），跳過同步以避免覆蓋現有狀態`,
        );
        return;
      }

      // 🔑 再次檢查：如果緩存中已有更終態的狀態，不要覆蓋
      if (
        cachedStatus &&
        (cachedStatus.status === JobStatus.COMPLETED ||
          cachedStatus.status === JobStatus.FAILED) &&
        (mappedStatus === JobStatus.QUEUED ||
          mappedStatus === JobStatus.PROCESSING)
      ) {
        this.logger.debug(
          `任務 ${jobId} 緩存狀態（${cachedStatus.status}）比 BullMQ 狀態（${mappedStatus}）更終態，跳過同步`,
        );
        return;
      }

      // 保留原始任務數據中的 userId
      const originalData = jobInstance.data;
      const taskUserId = originalData?.userId || null;

      // 構建同步的狀態數據
      const statusData: Partial<JobStatusCache> = {
        jobId,
        status: mappedStatus,
        updatedAt: new Date(),
        userId: taskUserId, // 🔑 保持 userId 一致性
        data: originalData,
      };

      // 根據狀態添加相應的時間戳
      if (mappedStatus === JobStatus.PROCESSING && !statusData.startedAt) {
        statusData.startedAt = new Date();
      } else if (
        (mappedStatus === JobStatus.COMPLETED ||
          mappedStatus === JobStatus.FAILED) &&
        !statusData.completedAt
      ) {
        statusData.completedAt = new Date();
      }

      // 🔑 保留緩存中的重要數據（如 previewData）
      if (cachedStatus?.previewData && !statusData.previewData) {
        statusData.previewData = cachedStatus.previewData;
      }

      // 更新緩存
      await this.cacheJobStatus(queueName, jobId, statusData);

      this.logger.debug(
        `佇列同步完成 - 任務 ${jobId} 狀態: ${mappedStatus}, userId: ${taskUserId || 'anonymous'}`,
      );
    } catch (error) {
      this.logger.error(
        `同步任務 ${jobId} 狀態失敗 (重試 ${retryCount}/${maxRetries}):`,
        error,
      );

      // 如果重試次數未達上限，進行重試
      if (retryCount < maxRetries) {
        setTimeout(
          () => {
            this.syncJobStatusFromQueue(queueName, jobId, job, retryCount + 1);
          },
          2000 * (retryCount + 1),
        ); // 遞增延遲
      }
    }
  }

  /**
   * 🔑 將 BullMQ 狀態映射到 JobStatus 枚舉
   * @private
   */
  private mapBullMQStateToJobStatus(state: string): JobStatus | null {
    switch (state) {
      case 'completed':
        return JobStatus.COMPLETED;
      case 'failed':
        return JobStatus.FAILED;
      case 'active':
        return JobStatus.PROCESSING;
      case 'waiting':
      case 'delayed':
      case 'prioritized':
        return JobStatus.QUEUED;
      case 'unknown':
      case '':
      case null:
      case undefined:
        this.logger.warn(
          `遇到未知的 BullMQ 狀態: ${state}，返回 null 以避免錯誤映射`,
        );
        return null;
      default:
        this.logger.warn(
          `未知的 BullMQ 狀態: ${state}，返回 null 以避免錯誤映射`,
        );
        return null;
    }
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
        removeOnComplete: 10, // 🔄 保留最近10個已完成任務
        removeOnFail: 5, // 🔄 保留最近5個失敗任務
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

      // 🔑 緩存初始任務狀態 - 關鍵修復：確保 userId 被正確緩存
      if (jobId) {
        // 從任務數據中提取 userId
        const taskUserId = (data as any)?.userId || null;

        this.logger.debug(
          `緩存任務 ${jobId} 初始狀態 - userId: ${taskUserId || 'anonymous'}`,
        );

        await this.cacheJobStatus(queueName, jobId.toString(), {
          jobId: jobId.toString(),
          status: JobStatus.QUEUED,
          updatedAt: new Date(),
          userId: taskUserId, // 🔑 關鍵修復：確保 userId 被緩存
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

        // 🔑 使用統一的狀態映射方法
        const mappedStatus = this.mapBullMQStateToJobStatus(state);

        if (mappedStatus === null) {
          this.logger.warn(
            `任務 ${jobId} 狀態映射失敗（${state}），返回 FAILED`,
          );
          return JobStatus.FAILED;
        }

        // 更新緩存
        await this.cacheJobStatus(queueName, jobId, {
          jobId,
          status: mappedStatus,
          updatedAt: new Date(),
        });

        return mappedStatus;
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

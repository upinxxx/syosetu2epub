import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QueueCorePort,
  JobData,
  JobOptions,
} from '@/domain/ports/queue/queue-core.port.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * 核心佇列服務
 * 負責基本的佇列操作：任務添加、狀態查詢、任務移除、數據獲取
 * 不包含事件監聽、緩存管理或健康檢查邏輯
 */
@Injectable()
export class QueueCoreService implements QueueCorePort {
  private readonly logger = new Logger(QueueCoreService.name);
  private readonly queues: Map<string, Queue>;

  constructor(
    @InjectQueue('epub')
    private readonly epubQueue: Queue,
    @InjectQueue('preview')
    private readonly previewQueue: Queue,
    @InjectQueue('kindle-delivery')
    private readonly kindleDeliveryQueue: Queue,
    // TODO: 暫時註解掉未使用的 queue
    // @InjectQueue('conversion')
    // private readonly conversionQueue: Queue,
    // @InjectQueue('health')
    // private readonly healthQueue: Queue,
  ) {
    // 初始化佇列映射
    this.queues = new Map<string, Queue>();
    this.queues.set('epub', epubQueue);
    this.queues.set('preview', previewQueue);
    this.queues.set('kindle-delivery', kindleDeliveryQueue);
    // TODO: 暫時註解掉未使用的 queue
    // this.queues.set('conversion', conversionQueue);
    // this.queues.set('health', healthQueue);

    this.logger.log('核心佇列服務已初始化');
  }

  /**
   * 添加任務到隊列
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
        removeOnComplete: 10,
        removeOnFail: 5,
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

      const jobId = job.id?.toString() || '';
      this.logger.log(`任務已添加到 ${queueName} 隊列: ${jobId}`);

      return jobId;
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
   */
  async getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatus | undefined> {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        this.logger.warn(`找不到任務 ${jobId} 在 ${queueName} 隊列中`);
        return JobStatus.FAILED;
      }

      try {
        const state = await job.getState();
        const mappedStatus = this.mapBullMQStateToJobStatus(state);

        if (mappedStatus === null) {
          this.logger.warn(
            `任務 ${jobId} 狀態映射失敗（${state}），返回 FAILED`,
          );
          return JobStatus.FAILED;
        }

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
   * 移除任務
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (job) {
        await job.remove();
        this.logger.log(`已從 ${queueName} 隊列移除任務 ${jobId}`);
      } else {
        this.logger.warn(`找不到要移除的任務 ${jobId} 在 ${queueName} 隊列中`);
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
   * 獲取任務數據
   */
  async getJobData(queueName: string, jobId: string): Promise<JobData | null> {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        this.logger.warn(`找不到任務 ${jobId} 的數據在 ${queueName} 隊列中`);
        return null;
      }

      if (!job.data) {
        this.logger.warn(`任務 ${jobId} 數據為空`);
        return null;
      }

      this.logger.debug(`獲取任務 ${jobId} 數據: ${JSON.stringify(job.data)}`);

      // 數據完整性檢查
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
   * 獲取佇列實例
   * @private
   */
  private getQueue(queueName: string): Queue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`未註冊的隊列: ${queueName}`);
    }
    return queue;
  }

  /**
   * 將 BullMQ 狀態映射到 JobStatus 枚舉
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
}

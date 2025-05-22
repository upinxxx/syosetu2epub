import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueuePort, JobData, JobOptions } from '@/domain/ports/queue.port.js';

/**
 * 隊列服務 - QueuePort 的實現
 * 統一管理所有隊列操作
 */
@Injectable()
export class QueueAdapter implements QueuePort {
  private readonly logger = new Logger(QueueAdapter.name);
  private readonly queues: Map<string, Queue>;

  constructor(
    @InjectQueue('epub')
    private readonly epubQueue: Queue,
  ) {
    // 初始化隊列映射
    this.queues = new Map<string, Queue>();
    this.queues.set('epub', epubQueue);
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
   * @returns 任務狀態字串
   */
  async getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<string | undefined> {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        return 'NOT_FOUND';
      }

      // 獲取任務狀態
      try {
        const state = await job.getState();
        return state ? state.toString() : 'UNKNOWN';
      } catch (stateError) {
        this.logger.warn(`無法獲取任務 ${jobId} 狀態: ${stateError.message}`);
        return 'UNKNOWN';
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
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

/**
 * Kindle交付隊列選項
 */
export interface KindleDeliveryJobOptions {
  deliveryId: string;
}

/**
 * Kindle交付隊列提供者
 * 封裝BullMQ隊列操作
 */
@Injectable()
export class KindleDeliveryQueue {
  private readonly logger = new Logger(KindleDeliveryQueue.name);
  private readonly queue: Queue<KindleDeliveryJobOptions>;
  private readonly connection: IORedis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redis.url');
    if (!redisUrl) {
      throw new Error('Redis URL is not configured');
    }

    this.connection = new IORedis(redisUrl);
    this.queue = new Queue<KindleDeliveryJobOptions>('kindle-delivery', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 5, // 最多嘗試5次
        backoff: {
          type: 'exponential',
          delay: 30000, // 初始延遲30秒
        },
        removeOnComplete: true, // 完成後刪除
        removeOnFail: false, // 失敗後不刪除
      },
    });

    this.logger.log('KindleDeliveryQueue initialized');
  }

  /**
   * 添加Kindle交付任務到隊列
   * @param deliveryId Kindle交付ID
   * @param options 可選參數
   * @returns 任務ID
   */
  async addJob(
    deliveryId: string,
    options?: { priority?: number; delay?: number },
  ): Promise<string> {
    try {
      const job = await this.queue.add(
        'process-delivery',
        { deliveryId },
        {
          priority: options?.priority,
          delay: options?.delay,
        },
      );

      this.logger.log(
        `Added kindle delivery job ${job.id} for delivery ${deliveryId}`,
      );
      return job.id;
    } catch (error) {
      this.logger.error(
        `Failed to add kindle delivery job for ${deliveryId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 獲取隊列資訊
   * @returns 隊列狀態資訊
   */
  async getQueueInfo(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }

  /**
   * 關閉隊列連接
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
    this.logger.log('KindleDeliveryQueue closed');
  }
}

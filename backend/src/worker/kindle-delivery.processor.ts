import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { KindleDeliveryFacade } from '@/application/kindle-delivery/kindle-delivery.facade.js';
import { KindleDeliveryJobOptions } from '@/infrastructure/queue/kindle-delivery.queue.js';

/**
 * Kindle交付處理器
 * 處理Kindle交付任務，調用應用層的KindleDeliveryFacade
 */
@Processor('kindle-delivery')
export class KindleDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(KindleDeliveryProcessor.name);

  constructor(private readonly kindleDeliveryFacade: KindleDeliveryFacade) {
    super();
  }

  /**
   * 處理Kindle交付任務
   * @param job BullMQ任務
   */
  async process(job: Job<KindleDeliveryJobOptions>): Promise<void> {
    const { deliveryId } = job.data;
    this.logger.log(
      `Processing kindle delivery job ${job.id} for delivery ${deliveryId}`,
    );

    try {
      // 更新進度
      await job.updateProgress(10);

      // 調用應用層處理交付
      await this.kindleDeliveryFacade.processDeliveryJob(deliveryId);

      // 完成
      await job.updateProgress(100);
      this.logger.log(`Kindle delivery job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Error processing kindle delivery job ${job.id}: ${error.message}`,
        error.stack,
      );

      // 記錄錯誤並重新拋出，讓BullMQ處理重試邏輯
      throw error;
    }
  }
}

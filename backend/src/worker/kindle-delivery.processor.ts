import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { KindleDeliveryFacade } from '@/application/kindle-delivery/kindle-delivery.facade.js';

/**
 * Kindle交付處理器
 * 處理Kindle交付任務，調用應用層的KindleDeliveryFacade
 */
@Processor('kindle-delivery')
export class KindleDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(KindleDeliveryProcessor.name);

  constructor(
    @Inject(KindleDeliveryFacade)
    private readonly kindleDeliveryFacade: KindleDeliveryFacade,
  ) {
    super();

    // 依賴注入檢查
    if (!this.kindleDeliveryFacade) {
      this.logger.error('KindleDeliveryFacade is not properly injected!');
      throw new Error('KindleDeliveryFacade dependency injection failed');
    }

    this.logger.log('KindleDeliveryProcessor initialized successfully');
  }

  /**
   * 處理Kindle交付任務
   * @param job BullMQ任務
   */
  async process(job: Job<{ deliveryId: string }>): Promise<void> {
    const { deliveryId } = job.data;

    if (!deliveryId) {
      const errorMsg = 'Delivery ID is missing from job data';
      this.logger.error(`Job ${job.id}: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    this.logger.log(
      `Processing kindle delivery job ${job.id} for delivery ${deliveryId}`,
    );

    try {
      // 檢查 facade 是否可用
      if (
        !this.kindleDeliveryFacade ||
        typeof this.kindleDeliveryFacade.processDeliveryJob !== 'function'
      ) {
        const errorMsg =
          'KindleDeliveryFacade.processDeliveryJob is not available';
        this.logger.error(`Job ${job.id}: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // 更新進度
      await job.updateProgress(10);

      // 調用應用層處理交付
      await this.kindleDeliveryFacade.processDeliveryJob(deliveryId);

      // 完成
      await job.updateProgress(100);
      this.logger.log(`Kindle delivery job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Error processing kindle delivery job ${job.id} for delivery ${deliveryId}: ${error.message}`,
        error.stack,
      );

      // 記錄錯誤並重新拋出，讓BullMQ處理重試邏輯
      throw error;
    }
  }
}

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';
import {
  KindleDeliveryRepository,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
  EPUB_JOB_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { Repository } from '@/domain/ports/repository/index.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';

/**
 * 處理 Kindle 交付任務用例
 */
@Injectable()
export class ProcessDeliveryJobUseCase {
  private readonly logger = new Logger(ProcessDeliveryJobUseCase.name);

  constructor(
    @Inject(KINDLE_DELIVERY_REPOSITORY_TOKEN)
    private readonly kindleDeliveryRepository: KindleDeliveryRepository,
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: Repository<EpubJob>,
  ) {}

  /**
   * 處理 Kindle 交付任務
   */
  async execute(deliveryId: string): Promise<void> {
    const delivery = await this.kindleDeliveryRepository.findById(deliveryId);
    if (!delivery) {
      throw new NotFoundException(
        `找不到 ID 為 ${deliveryId} 的 Kindle 交付任務`,
      );
    }

    try {
      // 標記為處理中
      if (delivery && typeof delivery.startProcessing === 'function') {
        delivery.startProcessing();
        await this.kindleDeliveryRepository.save(delivery);
      }

      // 獲取 EPUB 任務
      const epubJob = await this.epubJobRepository.findById(delivery.epubJobId);
      if (!epubJob) {
        throw new Error(`找不到 ID 為 ${delivery.epubJobId} 的 EPUB 任務`);
      }

      if (!epubJob.publicUrl) {
        throw new Error(`EPUB 任務 ${epubJob.id} 沒有公開 URL`);
      }

      // 在這裡實現發送 EPUB 到 Kindle 的邏輯
      // 這裡只是一個示例，實際上需要使用 AWS SES 或其他郵件服務發送
      this.logger.log(
        `正在發送 EPUB ${epubJob.publicUrl} 到 Kindle 郵箱 ${delivery.toEmail}`,
      );

      // 模擬發送成功
      // TODO: 實際實現發送邏輯
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));

      // 標記為成功
      if (delivery && typeof delivery.markSuccess === 'function') {
        delivery.markSuccess();
        await this.kindleDeliveryRepository.save(delivery);
        this.logger.log(`Kindle 交付任務 ${delivery.id} 已成功完成`);
      }
    } catch (error) {
      // 標記為失敗
      if (delivery && typeof delivery.markFailed === 'function') {
        delivery.markFailed(error.message);
        await this.kindleDeliveryRepository.save(delivery);
        this.logger.error(
          `Kindle 交付任務 ${delivery.id} 失敗: ${error.message}`,
        );
      }
      throw error;
    }
  }
}

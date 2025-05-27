import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';
import { KindleDeliveryPort } from '@/domain/ports/kindle-delivery.port.js';
import {
  KindleDeliveryRepository,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
} from '@/domain/ports/kindle-delivery-repository.port.js';
import { EPUB_JOB_REPOSITORY_TOKEN } from '@/infrastructure/repositories/repositories.module.js';
import { Repository } from '@/domain/ports/repository.port.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * Kindle 交付服務實現
 */
@Injectable()
export class KindleDeliveryService implements KindleDeliveryPort {
  private readonly logger = new Logger(KindleDeliveryService.name);

  constructor(
    @Inject(KINDLE_DELIVERY_REPOSITORY_TOKEN)
    private readonly kindleDeliveryRepository: KindleDeliveryRepository,
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: Repository<EpubJob>,
    @InjectQueue('kindle-delivery')
    private readonly kindleDeliveryQueue: Queue,
  ) {}

  /**
   * 發送 EPUB 到 Kindle
   */
  async sendToKindle(
    epubJobId: string,
    userId: string,
    toEmail: string,
  ): Promise<KindleDelivery> {
    // 1. 確認 EPUB 轉換已完成
    const epubJob = await this.epubJobRepository.findById(epubJobId);
    if (!epubJob) {
      throw new NotFoundException(`找不到 ID 為 ${epubJobId} 的 EPUB 任務`);
    }

    if (epubJob.status !== JobStatus.COMPLETED) {
      throw new Error(`EPUB 任務狀態為 ${epubJob.status}，無法發送至 Kindle`);
    }

    // 2. 創建 Kindle 交付記錄
    const kindleDelivery = KindleDelivery.create(
      epubJobId,
      userId,
      toEmail,
      epubJob,
    );

    // 3. 保存交付記錄
    const savedDelivery =
      await this.kindleDeliveryRepository.save(kindleDelivery);
    this.logger.log(`已創建 Kindle 交付任務: ${savedDelivery.id}`);

    // 4. 將任務加入隊列
    await this.kindleDeliveryQueue.add('send-to-kindle', {
      deliveryId: savedDelivery.id,
    });

    this.logger.log(`Kindle 交付任務 ${savedDelivery.id} 已加入隊列`);

    return savedDelivery;
  }

  /**
   * 獲取用戶的 Kindle 交付歷史
   */
  async getUserDeliveryHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    items: KindleDelivery[];
    totalItems: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const result = await this.kindleDeliveryRepository.findByUserIdPaginated(
      userId,
      page,
      limit,
    );

    return {
      ...result,
      page,
      limit,
    };
  }

  /**
   * 處理 Kindle 交付任務
   */
  async processDeliveryJob(deliveryId: string): Promise<void> {
    const delivery = await this.kindleDeliveryRepository.findById(deliveryId);
    if (!delivery) {
      throw new NotFoundException(
        `找不到 ID 為 ${deliveryId} 的 Kindle 交付任務`,
      );
    }

    try {
      // 標記為處理中
      delivery.startProcessing();
      await this.kindleDeliveryRepository.update(delivery);

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
      delivery.markSuccess();
      await this.kindleDeliveryRepository.update(delivery);
      this.logger.log(`Kindle 交付任務 ${delivery.id} 已成功完成`);
    } catch (error) {
      // 標記為失敗
      delivery.markFailed(error.message);
      await this.kindleDeliveryRepository.update(delivery);
      this.logger.error(
        `Kindle 交付任務 ${delivery.id} 失敗: ${error.message}`,
      );
      throw error;
    }
  }
}

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';
import {
  KindleDeliveryRepository,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
} from '@/domain/ports/kindle-delivery-repository.port.js';
import { EPUB_JOB_REPOSITORY_TOKEN } from '@/infrastructure/repositories/repositories.module.js';
import { Repository } from '@/domain/ports/repository.port.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * 發送 EPUB 到 Kindle 用例
 */
@Injectable()
export class SendToKindleUseCase {
  private readonly logger = new Logger(SendToKindleUseCase.name);

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
  async execute(
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
}

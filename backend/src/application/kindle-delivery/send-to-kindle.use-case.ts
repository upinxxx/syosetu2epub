import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';
import { KindleEmail } from '@/domain/entities/kindle-email.js';
import { DeliveryStatus } from '@/domain/enums/delivery-status.enum.js';
import {
  EpubJobRepository,
  EPUB_JOB_REPOSITORY_TOKEN,
  KindleDeliveryRepository,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
  UserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import {
  EmailSenderPort,
  EMAIL_SENDER_PORT,
  SendEmailOptions,
} from '@/domain/ports/email-sender.port.js';
import {
  FileDownloaderPort,
  FILE_DOWNLOADER_PORT,
} from '@/domain/ports/file-downloader.port.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

@Injectable()
export class SendToKindleUseCase {
  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: EpubJobRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepository,
    @Inject(KINDLE_DELIVERY_REPOSITORY_TOKEN)
    private readonly kindleDeliveryRepository: KindleDeliveryRepository,
    @Inject(EMAIL_SENDER_PORT)
    private readonly emailSender: EmailSenderPort,
    @Inject(FILE_DOWNLOADER_PORT)
    private readonly fileDownloader: FileDownloaderPort,
  ) {}

  /**
   * 發送EPUB到Kindle
   * @param userId 用戶ID
   * @param epubJobId EPUB任務ID
   * @param kindleEmailStr Kindle電子郵件地址
   */
  async execute(
    userId: string,
    epubJobId: string,
    kindleEmailStr: string,
  ): Promise<KindleDelivery> {
    // 1. 驗證Kindle電子郵件地址
    const kindleEmail = KindleEmail.create(kindleEmailStr);

    // 2. 獲取EPUB任務
    const epubJob = await this.epubJobRepository.findById(epubJobId);
    if (!epubJob) {
      throw new NotFoundException(`EPUB任務 ${epubJobId} 不存在`);
    }

    // 3. 檢查EPUB任務狀態
    if (epubJob.status !== JobStatus.COMPLETED) {
      throw new Error(
        `EPUB任務 ${epubJobId} 尚未完成，當前狀態: ${epubJob.status}`,
      );
    }

    // 4. 檢查下載URL是否存在
    if (!epubJob.downloadUrl) {
      throw new Error(`EPUB任務 ${epubJobId} 無下載連結`);
    }

    // 5. 獲取用戶
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`用戶 ${userId} 不存在`);
    }

    // 6. 創建Kindle交付記錄
    const kindleDelivery = KindleDelivery.create(
      epubJobId,
      userId,
      kindleEmail.value,
      epubJob,
      user,
    );

    // 7. 保存Kindle交付記錄
    await this.kindleDeliveryRepository.save(kindleDelivery);

    return kindleDelivery;
  }

  /**
   * 執行Kindle交付處理（由worker調用）
   * @param deliveryId Kindle交付ID
   */
  async processDelivery(deliveryId: string): Promise<void> {
    // 1. 獲取Kindle交付記錄
    const kindleDelivery =
      await this.kindleDeliveryRepository.findById(deliveryId);
    if (!kindleDelivery) {
      throw new NotFoundException(`Kindle交付 ${deliveryId} 不存在`);
    }

    try {
      // 2. 更新狀態為處理中
      kindleDelivery.startProcessing();
      await this.kindleDeliveryRepository.save(kindleDelivery);

      // 3. 獲取EPUB任務
      const epubJob = await this.epubJobRepository.findById(
        kindleDelivery.epubJobId,
      );
      if (!epubJob) {
        throw new Error(`EPUB任務 ${kindleDelivery.epubJobId} 不存在`);
      }

      // 4. 下載EPUB檔案
      const epubBuffer = await this.fileDownloader.download(
        epubJob.downloadUrl,
      );
      const filename =
        this.fileDownloader.getFilename(epubJob.downloadUrl) ||
        `${epubJob.title}.epub`;

      // 5. 發送郵件
      const emailOptions: SendEmailOptions = {
        to: kindleDelivery.toEmail,
        subject: '', // Kindle郵件主題可選
        attachmentBuffer: epubBuffer,
        filename: filename,
      };

      const result = await this.emailSender.sendEmail(emailOptions);

      if (result.success) {
        // 6. 更新狀態為成功
        kindleDelivery.markSuccess();
        await this.kindleDeliveryRepository.save(kindleDelivery);
      } else {
        throw new Error('發送郵件失敗');
      }
    } catch (error) {
      // 7. 更新狀態為失敗
      kindleDelivery.markFailed(error.message || '未知錯誤');
      await this.kindleDeliveryRepository.save(kindleDelivery);
      throw error;
    }
  }
}

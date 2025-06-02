import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  PreconditionFailedException,
  Logger,
} from '@nestjs/common';

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
import { GetRecentDeliveryQuery } from './get-recent-delivery.query.js';

@Injectable()
export class SendToKindleUseCase {
  private readonly COOLDOWN_SECONDS = 60; // 60秒冷卻時間
  private readonly logger = new Logger(SendToKindleUseCase.name);

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
    @Inject(GetRecentDeliveryQuery)
    private readonly getRecentDeliveryQuery: GetRecentDeliveryQuery,
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
    // 1. 檢查冷卻時間
    await this.checkCooldown(userId, epubJobId);

    // 2. 驗證Kindle電子郵件地址
    const kindleEmail = KindleEmail.create(kindleEmailStr);

    // 3. 獲取EPUB任務
    const epubJob = await this.epubJobRepository.findById(epubJobId);
    if (!epubJob) {
      throw new NotFoundException(`EPUB任務 ${epubJobId} 不存在`);
    }

    // 4. 檢查EPUB任務狀態
    if (epubJob.status !== JobStatus.COMPLETED) {
      throw new PreconditionFailedException(
        `EPUB任務 ${epubJobId} 尚未完成，當前狀態: ${epubJob.status}`,
      );
    }

    // 5. 檢查下載URL是否存在
    if (!epubJob.publicUrl) {
      throw new BadRequestException(`EPUB任務 ${epubJobId} 無下載連結`);
    }

    // 6. 獲取用戶
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`用戶 ${userId} 不存在`);
    }

    // 7. 創建Kindle交付記錄
    const kindleDelivery = KindleDelivery.create(
      epubJobId,
      userId,
      kindleEmail.value,
      epubJob,
      user,
    );

    // 8. 保存Kindle交付記錄
    await this.kindleDeliveryRepository.save(kindleDelivery);

    return kindleDelivery;
  }

  /**
   * 檢查冷卻時間
   * @param userId 用戶ID
   * @param epubJobId EPUB任務ID
   * @throws BadRequestException 如果仍在冷卻期間
   */
  private async checkCooldown(
    userId: string,
    epubJobId: string,
  ): Promise<void> {
    const recentDelivery = await this.getRecentDeliveryQuery.execute(
      userId,
      epubJobId,
      this.COOLDOWN_SECONDS,
    );

    if (recentDelivery) {
      const remainingSeconds =
        this.getRecentDeliveryQuery.calculateRemainingCooldown(
          recentDelivery,
          this.COOLDOWN_SECONDS,
        );

      if (remainingSeconds > 0) {
        throw new BadRequestException(
          `請等待 ${remainingSeconds} 秒後再重新發送此 EPUB`,
        );
      }
    }
  }

  /**
   * 執行Kindle交付處理（由worker調用）
   * @param deliveryId Kindle交付ID
   */
  async processDelivery(deliveryId: string): Promise<void> {
    this.logger.log(`Starting to process kindle delivery ${deliveryId}`);

    // 1. 獲取Kindle交付記錄
    const kindleDelivery =
      await this.kindleDeliveryRepository.findById(deliveryId);
    if (!kindleDelivery) {
      const errorMsg = `Kindle交付 ${deliveryId} 不存在`;
      this.logger.error(errorMsg);
      throw new NotFoundException(errorMsg);
    }

    // 記錄交付任務的詳細信息
    this.logger.log(
      `Processing delivery ${deliveryId} - User: ${kindleDelivery.userId}, EpubJob: ${kindleDelivery.epubJobId}, Email: ${kindleDelivery.toEmail}`,
    );

    try {
      // 2. 更新狀態為處理中
      this.logger.log(`Updating delivery ${deliveryId} status to processing`);
      kindleDelivery.startProcessing();
      await this.kindleDeliveryRepository.save(kindleDelivery);

      // 3. 獲取EPUB任務
      const epubJob = await this.epubJobRepository.findById(
        kindleDelivery.epubJobId,
      );
      if (!epubJob) {
        const errorMsg = `EPUB任務 ${kindleDelivery.epubJobId} 不存在`;
        this.logger.error(`Delivery ${deliveryId}: ${errorMsg}`);
        throw new NotFoundException(errorMsg);
      }

      this.logger.log(
        `Delivery ${deliveryId}: Found EPUB job with status ${epubJob.status}`,
      );

      // 4. 檢查 publicUrl 是否存在
      if (!epubJob.publicUrl) {
        const errorMsg = `EPUB任務 ${epubJob.id} 的 publicUrl 未定義`;
        this.logger.error(`Delivery ${deliveryId}: ${errorMsg}`);
        throw new BadRequestException(errorMsg);
      }

      // 5. 下載EPUB檔案
      this.logger.log(
        `Delivery ${deliveryId}: Downloading EPUB file from ${epubJob.publicUrl}`,
      );
      const startTime = Date.now();

      let epubBuffer: Buffer;
      try {
        epubBuffer = await this.fileDownloader.download(epubJob.publicUrl);
        const downloadTime = Date.now() - startTime;
        this.logger.log(
          `Delivery ${deliveryId}: EPUB file downloaded successfully in ${downloadTime}ms, size: ${epubBuffer.length} bytes`,
        );
      } catch (downloadError) {
        this.logger.error(
          `Delivery ${deliveryId}: Failed to download EPUB file: ${downloadError.message}`,
          downloadError.stack,
        );
        throw new BadRequestException(
          `下載 EPUB 檔案失敗: ${downloadError.message}`,
        );
      }

      // 取得檔名 - 使用小說標題或預設名稱
      let filename = this.fileDownloader.getFilename(epubJob.publicUrl);

      // 如果無法從 URL 取得檔名，嘗試使用小說標題
      if (!filename) {
        // 確認小說對象存在並有標題
        if (epubJob.novel && epubJob.novel.title) {
          filename = `${epubJob.novel.title}.epub`;
        } else {
          // 沒有小說標題時使用任務 ID 作為備用
          filename = `epub-${epubJob.id}.epub`;
        }
      }

      this.logger.log(`Delivery ${deliveryId}: Using filename: ${filename}`);

      // 6. 發送郵件
      this.logger.log(
        `Delivery ${deliveryId}: Sending email to ${kindleDelivery.toEmail} with file ${filename}`,
      );

      const emailOptions: SendEmailOptions = {
        to: kindleDelivery.toEmail,
        subject: '', // Kindle郵件主題可選
        attachmentBuffer: epubBuffer,
        filename: filename,
      };

      const emailStartTime = Date.now();
      let result;

      try {
        result = await this.emailSender.sendEmail(emailOptions);
        const emailTime = Date.now() - emailStartTime;
        this.logger.log(
          `Delivery ${deliveryId}: Email sending attempt completed in ${emailTime}ms, success: ${result.success}`,
        );
      } catch (emailError) {
        this.logger.error(
          `Delivery ${deliveryId}: Email sending failed: ${emailError.message}`,
          emailError.stack,
        );
        throw new BadRequestException(
          `發送郵件時發生錯誤: ${emailError.message}`,
        );
      }

      if (result.success) {
        // 7. 更新狀態為成功
        this.logger.log(
          `Delivery ${deliveryId}: Email sent successfully, message ID: ${result.id}`,
        );
        kindleDelivery.markSuccess();
        await this.kindleDeliveryRepository.save(kindleDelivery);
        this.logger.log(`Delivery ${deliveryId}: Status updated to completed`);
      } else {
        const errorMsg = '發送郵件失敗 - 郵件服務返回失敗狀態';
        this.logger.error(`Delivery ${deliveryId}: ${errorMsg}`);
        throw new BadRequestException(errorMsg);
      }
    } catch (error) {
      // 8. 更新狀態為失敗 - 確保即使在錯誤情況下也能保存狀態
      this.logger.error(
        `Delivery ${deliveryId}: Processing failed - ${error.message}`,
        error.stack,
      );

      try {
        const errorMessage = error.message || '未知錯誤';
        kindleDelivery.markFailed(errorMessage);
        await this.kindleDeliveryRepository.save(kindleDelivery);
        this.logger.log(
          `Delivery ${deliveryId}: Status updated to failed with error: ${errorMessage}`,
        );
      } catch (saveError) {
        this.logger.error(
          `Delivery ${deliveryId}: Critical error - Failed to save error status: ${saveError.message}`,
          saveError.stack,
        );
      }
      throw error;
    }
  }
}

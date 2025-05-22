import { Injectable, Logger } from '@nestjs/common';
import { EmailPort, EmailContent } from '../../domain/ports/email.port.js';

/**
 * 模擬電子郵件服務實現
 * 用於開發和測試環境
 */
@Injectable()
export class MockEmailService implements EmailPort {
  private readonly logger = new Logger(MockEmailService.name);

  /**
   * 發送電子郵件 - 僅記錄而不實際發送
   * @param content 郵件內容
   */
  async sendEmail(content: EmailContent): Promise<void> {
    this.logger.log('=== 模擬郵件服務 - 郵件發送請求 ===');
    this.logger.log(`收件人: ${content.to}`);
    this.logger.log(`寄件人: ${content.from || 'default'}`);
    this.logger.log(`主旨: ${content.subject}`);

    if (content.text) {
      this.logger.log('---- 純文字內容 ----');
      this.logger.log(content.text);
    }

    if (content.html) {
      this.logger.log('---- HTML 內容（僅前40字元） ----');
      this.logger.log(content.html.substring(0, 40) + '...');
    }

    if (content.attachments && content.attachments.length > 0) {
      this.logger.log('---- 附件 ----');
      content.attachments.forEach((attachment, index) => {
        this.logger.log(`附件 ${index + 1}: ${attachment.filename}`);
      });
    }

    this.logger.log('=== 模擬郵件服務 - 已成功記錄郵件內容 ===');
  }

  /**
   * 發送下載完成通知 - 僅記錄而不實際發送
   * @param to 收件人
   * @param novelTitle 小說標題
   * @param downloadUrl 下載連結
   */
  async sendDownloadNotification(
    to: string,
    novelTitle: string,
    downloadUrl: string,
  ): Promise<void> {
    this.logger.log('=== 模擬郵件服務 - 下載完成通知 ===');
    this.logger.log(`收件人: ${to}`);
    this.logger.log(`小說標題: ${novelTitle}`);
    this.logger.log(`下載連結: ${downloadUrl}`);
    this.logger.log('=== 模擬郵件服務 - 通知已記錄 ===');
  }
}

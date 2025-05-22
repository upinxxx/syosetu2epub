import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailPort, EmailContent } from '../../domain/ports/email.port.js';

/**
 * SMTP 電子郵件服務實現
 * 使用 Nodemailer 發送電子郵件
 */
@Injectable()
export class SmtpEmailService implements EmailPort {
  private readonly logger = new Logger(SmtpEmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly defaultFromEmail: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.defaultFromEmail = this.configService.get<string>(
      'SMTP_FROM',
      'noreply@syosetu2epub.app',
    );

    if (!host || !port || !user || !pass) {
      this.logger.warn('未提供完整的 SMTP 配置，電子郵件功能可能不可用');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    this.logger.log('SMTP 電子郵件服務已初始化');
  }

  /**
   * 發送電子郵件
   * @param content 郵件內容
   */
  async sendEmail(content: EmailContent): Promise<void> {
    try {
      this.logger.log(`開始發送電子郵件到 ${content.to}`);

      // 確保有寄件人
      if (!content.from) {
        content.from = this.defaultFromEmail;
      }

      // 發送郵件
      await this.transporter.sendMail(content);

      this.logger.log(`郵件已成功發送到 ${content.to}`);
    } catch (error) {
      this.logger.error(`郵件發送失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 發送下載完成通知
   * @param to 收件人
   * @param novelTitle 小說標題
   * @param downloadUrl 下載連結
   */
  async sendDownloadNotification(
    to: string,
    novelTitle: string,
    downloadUrl: string,
  ): Promise<void> {
    const subject = `【Syosetu2Epub】${novelTitle} 轉檔完成`;

    const html = `
      <h2>您的電子書已準備好</h2>
      <p>小說《${novelTitle}》已成功轉換為 EPUB 格式。</p>
      <p>您可以從以下連結下載：</p>
      <p><a href="${downloadUrl}" target="_blank">${downloadUrl}</a></p>
      <p>此連結有效期為 7 天。</p>
      <p>感謝您使用 Syosetu2Epub 服務！</p>
    `;

    const text = `您的電子書已準備好\n\n小說《${novelTitle}》已成功轉換為 EPUB 格式。\n\n您可以從以下連結下載：\n${downloadUrl}\n\n此連結有效期為 7 天。\n\n感謝您使用 Syosetu2Epub 服務！`;

    await this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }
}

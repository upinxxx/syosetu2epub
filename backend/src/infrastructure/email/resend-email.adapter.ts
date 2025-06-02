import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import {
  EmailSenderPort,
  SendEmailOptions,
  SendEmailResult,
} from '@/domain/ports/email-sender.port.js';

@Injectable()
export class ResendEmailAdapter implements EmailSenderPort {
  private readonly logger = new Logger(ResendEmailAdapter.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const resendConfig = this.configService.get('resend');
    const apiKey = resendConfig?.apiKey;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);

    // 嚴格要求fromEmail必須在配置中定義
    const fromEmail = resendConfig?.fromEmail;
    if (!fromEmail) {
      throw new Error('RESEND_FROM_EMAIL is not configured');
    }
    this.fromEmail = fromEmail;
  }

  /**
   * 發送郵件
   * @param options 郵件選項
   * @returns 發送結果
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from || this.fromEmail,
        to: [options.to],
        subject: options.subject || 'Your EPUB from Syosetu2EPUB',
        html: '<p>Your converted EPUB is attached. Enjoy reading!</p>',
        attachments: [
          {
            filename: options.filename,
            content: options.attachmentBuffer,
          },
        ],
      });

      if (error) {
        this.logger.error(
          `Failed to send email via Resend: ${error.message}`,
          error,
        );
        return {
          id: '',
          success: false,
        };
      }

      this.logger.log(
        `Email sent successfully to ${options.to} via Resend. ID: ${data?.id}`,
      );
      return {
        id: data?.id || '',
        success: true,
      };
    } catch (err) {
      this.logger.error(`Error in sendEmail: ${err.message}`, err.stack);
      return {
        id: '',
        success: false,
      };
    }
  }
}

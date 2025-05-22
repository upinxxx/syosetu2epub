import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SmtpEmailService } from './smtp-email.service.js';
import { MockEmailService } from './mock-email.service.js';
import { EMAIL_PROVIDER_TOKEN } from '@/domain/ports/email.port.js';
/**
 * 電子郵件模組 - 基礎設施層
 * 提供電子郵件服務實現
 * 根據環境配置選擇使用實際的 SMTP 服務或模擬服務
 */
@Module({
  imports: [ConfigModule],
  providers: [
    SmtpEmailService,
    MockEmailService,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService) => {
        const useRealEmail =
          configService.get<string>('USE_REAL_EMAIL', 'false') === 'true';

        if (useRealEmail) {
          return new SmtpEmailService(configService);
        } else {
          return new MockEmailService();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_PROVIDER_TOKEN],
})
export class EmailModule {}

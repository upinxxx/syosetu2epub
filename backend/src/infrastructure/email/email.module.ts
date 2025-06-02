import { Module } from '@nestjs/common';

import { ResendEmailAdapter } from './resend-email.adapter.js';
import { EMAIL_SENDER_PORT } from '@/domain/ports/email-sender.port.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [{ provide: EMAIL_SENDER_PORT, useClass: ResendEmailAdapter }],
  exports: [EMAIL_SENDER_PORT],
})
export class EmailModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InfrastructureModule } from '../infrastructure/infrastructure.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConvertModule } from './convert/convert.module.js';
import { PreviewModule } from './preview/preview.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { UserModule } from './user/user.module.js';
import { KindleDeliveryModule } from './kindle-delivery/kindle-delivery.module.js';
import { StorageModule } from './storage/storage.module.js';
/**
 * 應用層模組
 * 整合所有子域模組，並依賴於基礎設施模組
 */
@Module({
  imports: [
    // 子域模組
    AuthModule,
    ConvertModule,
    PreviewModule,
    JobsModule,
    UserModule,
    KindleDeliveryModule,
    StorageModule,

    // 基礎設施模組
    InfrastructureModule,
  ],

  exports: [
    // 導出所有子域模組
    AuthModule,
    ConvertModule,
    PreviewModule,
    JobsModule,
    UserModule,
    KindleDeliveryModule,
    StorageModule,
  ],
})
export class ApplicationModule {}

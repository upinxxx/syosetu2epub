import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from '../infrastructure/queue/queue.module.js';
import { EpubQueueProcessor } from './epub-queue.processor.js';
import { PreviewQueueProcessor } from './preview-queue.processor.js';
import { KindleDeliveryProcessor } from './kindle-delivery.processor.js';
import { ApplicationModule } from '../application/application.module.js';
import { NovelOrmEntity } from '../infrastructure/entities/novel.orm-entity.js';
import { EpubJobOrmEntity } from '../infrastructure/entities/epub-job.orm-entity.js';
import { UserOrmEntity } from '../infrastructure/entities/user.orm-entity.js';
import { KindleDeliveryOrmEntity } from '../infrastructure/entities/kindle-delivery.orm-entity.js';
import { JobsModule } from '../application/jobs/jobs.module.js';
import { SchedulerService } from './scheduler.service.js';
import { ConvertModule } from '../application/convert/convert.module.js';
import { RedisModule } from '../infrastructure/redis/redis.module.js';

/**
 * Worker 模組 - 包含處理 EPUB 轉換和預覽任務所需的模組
 * 與 AppModule 不同，不包含 HTTP 控制器等 API 元件
 */
@Module({
  imports: [
    // 基礎配置模組
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 排程模組 - 用於 Worker 的定時任務
    ScheduleModule.forRoot(),

    // 數據庫配置 - 與 AppModule 相同，但僅供 Worker 使用
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [
          NovelOrmEntity,
          EpubJobOrmEntity,
          UserOrmEntity,
          KindleDeliveryOrmEntity,
        ],
        synchronize: false,
      }),
    }),

    // 優先導入 ConvertModule，確保 ConvertFacade 可用
    ConvertModule,

    // 應用層模組 - 提供所有 Use Cases 和 Facades (包含 KindleDeliveryModule)
    ApplicationModule,

    // 隊列模組 - 提供 BullMQ 連接
    QueueModule,

    // Job 模組 - 提供任務狀態同步服務
    JobsModule,

    // Redis 模組
    RedisModule,
  ],
  providers: [
    EpubQueueProcessor,
    PreviewQueueProcessor,
    KindleDeliveryProcessor,
    SchedulerService,
  ],
})
export class WorkerModule {}

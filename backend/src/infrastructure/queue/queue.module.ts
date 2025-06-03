// src/infrastructure/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';
import { RedisModule } from '@/infrastructure/redis/redis.module.js';

// 新的模組化服務
import { QueueCoreService } from './services/queue-core.service.js';
import { QueueCacheService } from './services/queue-cache.service.js';
import { QueueEventHandler } from './services/queue-event.handler.js';
import { QueueHealthService } from './services/queue-health.service.js';

// 向後兼容適配器
import { QueueAdapterCompatibility } from './queue-adapter-compat.js';

@Module({
  imports: [
    ConfigModule,
    RedisModule, // 引入統一的 Redis 模組
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('UPSTASH_REDIS_HOST'),
          port: configService.get('UPSTASH_REDIS_PORT'),
          username: configService.get('UPSTASH_REDIS_USERNAME'),
          password: configService.get('UPSTASH_REDIS_PASSWORD'),
          tls: {
            // 優化 TLS 設定，減少連接問題
            rejectUnauthorized: false,
          },
          // 優化 BullMQ 連接設定
          connectTimeout: 10000,
          lazyConnect: true,
          maxRetriesPerRequest: null, // BullMQ 要求必須為 null
          retryDelayOnFailover: 100,
          keepAlive: 30000,
          family: 4,
          enableOfflineQueue: true, // 啟用離線佇列以提高穩定性
          reconnectOnError: (err) => {
            const targetError =
              /READONLY|ECONNRESET|ETIMEDOUT|ENOTFOUND|ENETUNREACH/;
            return targetError.test(err.message);
          },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'epub' },
      { name: 'preview' },
      { name: 'kindle-delivery' },
      { name: 'health' },
      { name: 'conversion' },
    ),
  ],
  providers: [
    // 核心服務（Redis 客戶端由 RedisModule 提供）
    QueueCoreService,
    QueueCacheService,
    QueueEventHandler,
    QueueHealthService,

    // 服務依賴注入令牌
    {
      provide: 'QUEUE_CACHE_SERVICE',
      useExisting: QueueCacheService,
    },

    // 向後兼容的適配器
    QueueAdapterCompatibility,

    // 主要 Port Token（向後兼容）
    {
      provide: QUEUE_PORT_TOKEN,
      useExisting: QueueAdapterCompatibility,
    },
  ],
  exports: [
    BullModule,
    QUEUE_PORT_TOKEN,
    // 也匯出新服務供其他模組使用
    QueueCoreService,
    QueueCacheService,
    QueueEventHandler,
    QueueHealthService,
  ],
})
export class QueueModule {}

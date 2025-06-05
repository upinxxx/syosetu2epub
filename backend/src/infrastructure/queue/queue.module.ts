// src/infrastructure/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';
import { RedisModule } from '@/infrastructure/redis/redis.module.js';
import { RedisClient } from '@/infrastructure/redis/redis.client.js';

// 新的模組化服務
import { QueueCoreService } from './services/queue-core.service.js';
import { QueueCacheService } from './services/queue-cache.service.js';
import { QueueEventHandler } from './services/queue-event.handler.js';
import { QueueHealthService } from './services/queue-health.service.js';

// 向後兼容適配器
import { QueueAdapter } from './queue.adapter.js';

@Module({
  imports: [
    RedisModule,
    BullModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisClient, ConfigService],
      useFactory: async (
        redisClient: RedisClient,
        configService: ConfigService,
      ) => {
        try {
          // 等待 Redis 客戶端就緒
          await redisClient.whenReady();
          const ioredisInstance = redisClient.getClient();

          if (ioredisInstance && redisClient.isReady()) {
            return {
              connection: ioredisInstance,
              defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 50,
                attempts: 3,
                backoff: {
                  type: 'exponential',
                  delay: 2000,
                },
              },
            };
          }
        } catch (error) {
          console.error(
            `QueueModule: RedisClient 連接失敗，使用後備方案: ${error.message}`,
          );
        }

        // 後備方案：直接使用環境變數配置
        return {
          connection: {
            host: configService.get('UPSTASH_REDIS_HOST'),
            port: configService.get('UPSTASH_REDIS_PORT'),
            username: configService.get('UPSTASH_REDIS_USERNAME'),
            password: configService.get('UPSTASH_REDIS_PASSWORD'),
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
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
    QueueCoreService,
    QueueCacheService,
    QueueEventHandler,
    QueueHealthService,

    {
      provide: 'QUEUE_CACHE_SERVICE',
      useExisting: QueueCacheService,
    },

    QueueAdapter,

    {
      provide: QUEUE_PORT_TOKEN,
      useExisting: QueueAdapter,
    },
  ],
  exports: [
    BullModule,
    QUEUE_PORT_TOKEN,
    QueueCoreService,
    QueueCacheService,
    QueueEventHandler,
    QueueHealthService,
  ],
})
export class QueueModule {}

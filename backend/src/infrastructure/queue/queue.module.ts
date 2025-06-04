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
        console.log('QueueModule: 使用 RedisClient 統一連接管理');

        try {
          // 等待 Redis 客戶端就緒
          await redisClient.whenReady();
          const ioredisInstance = redisClient.getClient();

          if (ioredisInstance && redisClient.isReady()) {
            console.log('QueueModule: 成功使用 RedisClient 統一連接');
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
        console.warn('QueueModule: 使用配置後備方案');
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        const username = configService.get<string>('REDIS_USERNAME');
        const password = configService.get<string>('REDIS_PASSWORD');

        if (!host || !port) {
          throw new Error('Redis configuration not found');
        }

        return {
          connection: {
            host,
            port,
            username,
            password,
            tls: host.includes('upstash')
              ? { rejectUnauthorized: false }
              : undefined,
            connectTimeout:
              configService.get<number>('REDIS_CONNECT_TIMEOUT') || 15000,
            commandTimeout:
              configService.get<number>('REDIS_COMMAND_TIMEOUT') || 10000,
            maxRetriesPerRequest:
              configService.get<number>('REDIS_MAX_RETRIES_PER_REQUEST') ||
              null,
            enableOfflineQueue:
              configService.get<boolean>('REDIS_ENABLE_OFFLINE_QUEUE') ?? false,
            keepAlive: configService.get<number>('REDIS_KEEP_ALIVE') || 30000,
            lazyConnect: false,
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

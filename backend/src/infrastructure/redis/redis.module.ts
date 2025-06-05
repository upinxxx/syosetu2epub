import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisClient } from './redis.client.js';

/**
 * Redis 全域模組
 * 提供統一的 Redis 連接服務給整個應用程式使用
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisClient,
    // 提供 REDIS_CLIENT token 以保持向後兼容
    {
      provide: 'REDIS_CLIENT',
      useFactory: (redisClient: RedisClient) => redisClient.getClient(),
      inject: [RedisClient],
    },
  ],
  exports: [RedisClient, 'REDIS_CLIENT'],
})
export class RedisModule {}

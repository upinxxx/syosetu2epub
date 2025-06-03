import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service.js';

/**
 * Redis 全域模組
 * 提供統一的 Redis 連接服務給整個應用程式使用
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisService,
    // 提供 REDIS_CLIENT token 以保持向後兼容
    {
      provide: 'REDIS_CLIENT',
      useFactory: (redisService: RedisService) => redisService.getClient(),
      inject: [RedisService],
    },
  ],
  exports: [RedisService, 'REDIS_CLIENT'],
})
export class RedisModule {}

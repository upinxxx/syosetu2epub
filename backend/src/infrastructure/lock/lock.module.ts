import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@/infrastructure/redis/redis.module.js';
import { DistributedLockAdapter } from './distributed-lock.adapter.js';
import { LOCK_PORT_TOKEN } from '@/domain/ports/lock.port.js';

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [
    DistributedLockAdapter,
    {
      provide: LOCK_PORT_TOKEN,
      useExisting: DistributedLockAdapter,
    },
  ],
  exports: [LOCK_PORT_TOKEN],
})
export class LockModule {}

// src/infrastructure/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueAdapter } from './queue.adapter.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('UPSTASH_REDIS_HOST'),
          port: configService.get('UPSTASH_REDIS_PORT'),
          username: configService.get('UPSTASH_REDIS_USERNAME'),
          password: configService.get('UPSTASH_REDIS_PASSWORD'),
          tls: {},
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: 'epub',
      },
      {
        name: 'preview',
      },
    ),
  ],
  providers: [
    QueueAdapter,
    {
      provide: QUEUE_PORT_TOKEN,
      useExisting: QueueAdapter,
    },
  ],
  exports: [BullModule, QUEUE_PORT_TOKEN],
})
export class QueueModule {}

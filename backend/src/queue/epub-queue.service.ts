// src/queue/epub-queue.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class EpubQueueService implements OnModuleDestroy {
  private readonly epubQueue: Queue;

  constructor() {
    this.epubQueue = new Queue('epub-queue', {
      connection: {
        // Upstash Redis 連線
        url: process.env.UPSTASH_REDIS_REST_URL,
        // 如果需要 Redis REST Token
        password: process.env.UPSTASH_REDIS_REST_TOKEN,
      },
    });
  }

  async addJob(data: Record<string, any>) {
    return this.epubQueue.add('generate-epub', data);
  }

  async onModuleDestroy() {
    await this.epubQueue.close();
  }
}

// src/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { EpubQueueService } from './epub-queue.service.js';
import { EpubProcessor } from './epub.processor.js';
import { EpubModule } from '@/epub/epub.module.js';

@Module({
  imports: [EpubModule],
  providers: [EpubQueueService, EpubProcessor],
  exports: [EpubQueueService],
})
export class QueueModule {}

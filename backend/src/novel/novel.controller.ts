// src/novel/novel.controller.ts
import { Controller, Post, Body, Inject, forwardRef } from '@nestjs/common';
import { EpubService } from '@epub/epub.service.js';
import { PreviewNovelDto } from './dto/preview-novel.dto.js';
import { EpubQueueService } from '@/queue/epub-queue.service.js';

@Controller('novels')
export class NovelController {
  constructor(
    @Inject(forwardRef(() => EpubService))
    private readonly epubService: EpubService,
    private readonly epubQueueService: EpubQueueService,
  ) {
    console.log('epubService is:', this.epubService);
  }

  @Post('preview')
  async preview(@Body() body: PreviewNovelDto) {
    const jobId = await this.epubQueueService.addJob({ url: body.url });
    return { message: 'EPUB job queued', jobId };
  }
}

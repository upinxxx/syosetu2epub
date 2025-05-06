// src/novel/novel.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { NovelService } from './novel.service.js';
import { NovelController } from './novel.controller.js';
import { EpubModule } from '@/epub/epub.module.js';

@Module({
  imports: [forwardRef(() => EpubModule)],
  controllers: [NovelController],
  providers: [NovelService],
})
export class NovelModule {}

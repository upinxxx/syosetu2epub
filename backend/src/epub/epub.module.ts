// epub.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { EpubService } from './epub.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpubController } from './epub.controller.js';
import { CrawlerModule } from '@/crawler/crawler.module.js';
import { CommonModule } from '@/common/common.module.js';
import { NovelModule } from '@/novel/novel.module.js';
import { CrawlerFactoryService } from '@/crawler/crawler-factory.service.js';
import { SupabaseService } from '@/common/supabase.service.js';
import { EpubJob } from './entities/epub-job.entity.js';
import { User } from '@/user/entities/user.entity.js';
import { Novel } from '@/novel/entities/novel.entity.js';

@Module({
  imports: [
    CrawlerModule,
    TypeOrmModule.forFeature([EpubJob, User, Novel]),
    CommonModule,
    forwardRef(() => NovelModule),
  ],
  controllers: [EpubController],
  providers: [EpubService, CrawlerFactoryService, SupabaseService],
  exports: [EpubService],
})
export class EpubModule {}

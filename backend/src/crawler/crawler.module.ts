// src/crawler/crawler.module.ts
import { Module } from '@nestjs/common';
import { CrawlerFactoryService } from './crawler-factory.service.js';
import { SyosetuCrawlerStrategy } from './syosetu-crawler.strategy.js';

@Module({
  providers: [CrawlerFactoryService, SyosetuCrawlerStrategy],
  exports: [CrawlerFactoryService, SyosetuCrawlerStrategy], // ✅ 給其他模組用
})
export class CrawlerModule {}

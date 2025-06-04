// src/crawler/crawler.module.ts
import { Module } from '@nestjs/common';
import { CrawlerFactory } from './crawler-factory.js';
import { CRAWLER_FACTORY_TOKEN } from '@/domain/ports/factory/crawler.factory.port.js';
import { NarouCrawlerStrategy } from './strategies/narou-crawler.strategy.js';
import { KakuyomuCrawlerStrategy } from './strategies/kakuyomu-crawler.strategy.js';

@Module({
  providers: [
    NarouCrawlerStrategy,
    KakuyomuCrawlerStrategy,
    { provide: CRAWLER_FACTORY_TOKEN, useClass: CrawlerFactory },
  ],
  exports: [CRAWLER_FACTORY_TOKEN], // ✅ 給其他模組用
})
export class CrawlerModule {}

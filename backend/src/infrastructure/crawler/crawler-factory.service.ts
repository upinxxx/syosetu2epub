// src/crawler/crawler-factory.service.ts
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CrawlerStrategy } from '../../domain/ports/crawler.strategy.port.js';
import { NarouCrawlerStrategy } from './strategies/narou-crawler.strategy.js';
import { CrawlerFactoryPort } from '@/domain/ports/crawler.factory.port.js';
import { KakuyomuCrawlerStrategy } from './strategies/kakuyomu-crawler.strategy.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
@Injectable()
export class CrawlerFactoryService implements CrawlerFactoryPort {
  constructor(
    @Inject(NarouCrawlerStrategy)
    private readonly narouCrawlerStrategy: CrawlerStrategy,
    @Inject(KakuyomuCrawlerStrategy)
    private readonly kakuyomuCrawlerStrategy: CrawlerStrategy,
  ) {}

  /**
   * 根據網址選擇合適的爬蟲策略
   * @param url 要爬取小說的網址
   * @returns CrawlerStrategy 實例
   */
  getStrategy(source: NovelSource): CrawlerStrategy {
    switch (source) {
      case NovelSource.NAROU:
        return this.narouCrawlerStrategy;
      case NovelSource.KAKUYOMU:
        return this.kakuyomuCrawlerStrategy;
      default:
        throw new BadRequestException('目前不支援此網站的爬蟲策略');
    }
  }
}

// src/crawler/crawler-factory.service.ts
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CrawlerStrategy } from './strategy.interface.js';
import { SyosetuCrawlerStrategy } from './syosetu-crawler.strategy.js';

@Injectable()
export class CrawlerFactoryService {
  constructor(
    @Inject(SyosetuCrawlerStrategy)
    private readonly syosetuCrawlerStrategy: SyosetuCrawlerStrategy,
  ) {
    console.log('[CrawlerFactoryService] constructor called!');
  }

  /**
   * 根據網址選擇合適的爬蟲策略
   * @param url 要爬取小說的網址
   * @returns CrawlerStrategy 實例
   */
  getStrategy(url: string): CrawlerStrategy {
    if (url.includes('ncode.syosetu.com')) {
      return this.syosetuCrawlerStrategy;
    }
    throw new BadRequestException('目前不支援此網站的爬蟲策略');
  }
}

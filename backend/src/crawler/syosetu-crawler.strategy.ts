// src/crawler/syosetu-crawler.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { CrawlerStrategy, NovelData } from './strategy.interface.js';
import {
  syosetuNovelInfoCrawler,
  syosetuChapterContentCrawler,
} from './utils/syosetu.crawler.js';

@Injectable()
export class SyosetuCrawlerStrategy implements CrawlerStrategy {
  private readonly logger = new Logger(SyosetuCrawlerStrategy.name);

  async fetchNovelData(url: string): Promise<NovelData> {
    try {
      return await syosetuNovelInfoCrawler(url);
    } catch (error) {
      this.logger.error('Error in fetchNovelData', error);
      throw error;
    }
  }

  async fetchChapterContent(url: string): Promise<string> {
    try {
      return await syosetuChapterContentCrawler(url);
    } catch (error) {
      this.logger.error('Error in fetchChapterContent', error);
      throw error;
    }
  }
}

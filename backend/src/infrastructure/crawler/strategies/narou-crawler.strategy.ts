import { Injectable, Logger } from '@nestjs/common';
import {
  CrawlerStrategy,
  NovelIndex,
} from '../../../domain/ports/crawler.strategy.port.js';
import {
  crawlNovelIndex,
  crawlChapterContent,
} from '../adapters/narou-crawler.adapter.js';

@Injectable()
export class NarouCrawlerStrategy implements CrawlerStrategy {
  private readonly logger = new Logger(NarouCrawlerStrategy.name);

  async fetchNovelIndex(url: string): Promise<NovelIndex> {
    try {
      return await crawlNovelIndex(url);
    } catch (error) {
      this.logger.error('Error in fetchNovelData', error);
      throw error;
    }
  }

  async fetchChapterContent(url: string): Promise<string> {
    try {
      return await crawlChapterContent(url);
    } catch (error) {
      this.logger.error('Error in fetchChapterContent', error);
      throw error;
    }
  }
}

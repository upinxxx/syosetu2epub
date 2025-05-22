import { CrawlerStrategy } from './crawler.strategy.port.js';

export const CRAWLER_FACTORY_TOKEN = Symbol('CRAWLER_FACTORY_PORT');

export interface CrawlerFactoryPort {
  getStrategy(source: string): CrawlerStrategy;
}

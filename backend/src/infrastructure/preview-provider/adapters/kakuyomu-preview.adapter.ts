// src/infrastructure/preview-provider/adapters/kakuyomu-preview.adapter.ts

import { NovelIndex } from '@domain/ports/crawler.strategy.port.js';
import { crawlNovelIndex } from '@infrastructure/crawler/adapters/kakuyomu-crawler.adapter.js';

export async function fetchNovelInfo(url: string): Promise<NovelIndex> {
  const novelData: NovelIndex = await crawlNovelIndex(url);
  return novelData;
}

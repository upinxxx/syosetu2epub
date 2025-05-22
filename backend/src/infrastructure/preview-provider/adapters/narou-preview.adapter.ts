import { NovelIndex } from '@domain/ports/crawler.strategy.port.js';
import { fetchWithRetry } from '@/infrastructure/utils/fetch.js';

export async function fetchNovelInfo(url: string): Promise<NovelIndex> {
  // 使用 API 獲取小說基本資訊
  console.log(url);
  const data = await fetchWithRetry(url);
  const novelData = JSON.parse(data)[1];

  return {
    novelTitle: novelData.title,
    novelAuthor: novelData.writer || '未知作者',
    novelDescription: novelData.story || '',
  };
}

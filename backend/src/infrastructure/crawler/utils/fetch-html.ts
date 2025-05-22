import { load, type CheerioAPI } from 'cheerio';
import { fetchWithRetry } from '@/infrastructure/utils/fetch.js';

export async function fetchPageHtml(url: string): Promise<CheerioAPI> {
  const html = await fetchWithRetry(url);
  return load(html);
}

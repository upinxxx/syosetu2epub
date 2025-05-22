export const CRAWLER_STRATEGY_TOKEN = Symbol('CRAWLER_STRATEGY');

export interface ChapterIndex {
  // 章節標題
  chapterTitle: string | null;
  // 小節標題
  title: string;
  // 小節網址
  url: string;
}

export interface NovelIndex {
  // 小說標題
  novelTitle: string;
  // 小說作者
  novelAuthor: string;
  // 小說描述
  novelDescription: string;
  // 小說章節列表，單純預覽時不需要
  chapters?: ChapterIndex[];
}

export interface CrawlerStrategy {
  /**
   * 根據小說網址抓取小說資料
   */
  fetchNovelIndex(url: string): Promise<NovelIndex>;
  fetchChapterContent(url: string): Promise<string>;
}

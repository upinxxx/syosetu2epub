// src/crawler/strategy.interface.ts
export interface Chapter {
  // 你原本的 Chapter 結構，這邊保留 chapterTitle、title 與 url
  chapterTitle: string | null;
  title: string;
  url: string;
  // 新增 content 欄位，存放章節內文
  content?: string;
}

export interface NovelData {
  novelTitle: string;
  novelAuthor: string;
  novelDescription: string;
  chapters: Chapter[];
}

export interface CrawlerStrategy {
  /**
   * 根據小說網址抓取小說資料
   */
  fetchNovelData(url: string): Promise<NovelData>;
  fetchChapterContent(url: string): Promise<string>;
}

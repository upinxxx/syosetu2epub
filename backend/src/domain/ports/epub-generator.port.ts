// Port 令牌，用於依賴注入
export const EPUB_GENERATOR_TOKEN = Symbol('EPUB_GENERATOR_TOKEN');

/**
 * 小說章節內容
 */
export interface ChapterContent {
  /** 章節標題 */
  chapterTitle: string;

  /** 小節標題 */
  title: string;

  /** 章節內容 */
  data: string;
}

/**
 * EPUB 元數據
 */
export interface EpubMetadata {
  /** 小說標題 */
  novelTitle: string;

  /** 小說作者 */
  novelAuthor: string;

  /** 小說描述 */
  novelDescription: string;

  /** 小說章節內容 */
  chapters?: ChapterContent[];
}

/**
 * EPUB 生成器 Port 接口
 * 負責將小說數據轉換為 EPUB 文件
 */
export interface EpubGeneratorPort {
  /**
   * 生成 EPUB 文件
   * @param metadata EPUB 元數據
   * @returns 生成的 EPUB 文件的資訊
   */
  generateEpub(metadata: EpubMetadata): Promise<{
    outputPath: string;
    fileName: string;
  }>;
}

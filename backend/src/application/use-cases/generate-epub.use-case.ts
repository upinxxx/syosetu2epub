// generate-epub.use-case.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  EPUB_GENERATOR_TOKEN,
  EpubGeneratorPort,
  EpubMetadata,
} from '@/domain/ports/epub-generator.port.js';
import {
  STORAGE_PORT_TOKEN,
  StoragePort,
} from '@/domain/ports/storage.port.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import {
  CRAWLER_FACTORY_TOKEN,
  CrawlerFactoryPort,
} from '@/domain/ports/crawler.factory.port.js';
import { NovelIndex } from '@/domain/ports/crawler.strategy.port.js';

/**
 * 生成 EPUB 檔案 UseCase
 * 整合 crawler 和 epub-generator 的邏輯
 */
@Injectable()
export class GenerateEpubUseCase {
  private readonly logger = new Logger(GenerateEpubUseCase.name);

  constructor(
    @Inject(CRAWLER_FACTORY_TOKEN)
    private readonly crawlerFactory: CrawlerFactoryPort,
    @Inject(EPUB_GENERATOR_TOKEN)
    private readonly epubGenerator: EpubGeneratorPort,
    @Inject(STORAGE_PORT_TOKEN)
    private readonly storageService: StoragePort,
  ) {}

  /**
   * 生成 EPUB 檔案
   * @param novelUrl 小說 URL
   * @param source 小說來源
   * @returns EPUB 檔案的公開 URL
   */
  async execute(novelUrl: string, source: NovelSource): Promise<string> {
    try {
      this.logger.log(`開始生成 EPUB 檔案，來源: ${source}, URL: ${novelUrl}`);

      // 使用爬蟲獲取小說數據
      const novelData = await this.buildMetadata(novelUrl, source);
      this.logger.log(
        `爬取完成: ${novelData.novelTitle} (${novelData.chapters?.length} 章)`,
      );

      // 生成 EPUB 檔案
      this.logger.log('開始生成 EPUB 檔案');
      const epubBuffer = await this.epubGenerator.generateEpub({
        novelTitle: novelData.novelTitle,
        novelAuthor: novelData.novelAuthor,
        novelDescription: novelData.novelDescription || '',
        chapters: novelData.chapters,
      });
      this.logger.log(`EPUB 檔案生成完成`);

      // 4. 上傳到儲存服務
      this.logger.log(`上傳 EPUB 檔案到儲存服務: ${epubBuffer.fileName}`);
      const publicUrl = await this.storageService.uploadFile(
        epubBuffer.outputPath,
        epubBuffer.fileName,
        'application/epub+zip',
      );
      this.logger.log(`上傳完成，公開 URL: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      this.logger.error(`生成 EPUB 檔案失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async buildMetadata(
    url: string,
    source: NovelSource,
  ): Promise<EpubMetadata> {
    // 根據來源獲取相對應的爬蟲
    const crawler = this.crawlerFactory.getStrategy(source);
    if (!crawler) {
      throw new Error(`找不到適合 ${source} 的爬蟲`);
    }
    this.logger.log(`使用 ${crawler.constructor.name} 爬取小說: ${url}`);

    const novelIndex: NovelIndex = await crawler.fetchNovelIndex(url);
    this.logger.log(`取得小說資料：${novelIndex.novelTitle}`);

    const chapters: { chapterTitle: string; title: string; data: string }[] =
      [];
    for (const chapter of novelIndex?.chapters || []) {
      const chapterContent = await crawler.fetchChapterContent(chapter.url);
      chapters.push({
        chapterTitle: chapter.chapterTitle || '',
        title: chapter.title,
        data: chapterContent,
      });

      this.logger.log(`已爬取章節: ${chapter.title}`);
    }

    return {
      novelTitle: novelIndex.novelTitle,
      novelAuthor: novelIndex.novelAuthor,
      novelDescription: novelIndex.novelDescription,
      chapters,
    };
  }
}

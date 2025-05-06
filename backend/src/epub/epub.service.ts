import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import fs from 'fs';
import { tmpdir } from 'os';
import { MyEpub } from './custom-epub.js';
import { CrawlerStrategy, NovelData } from '@crawler/strategy.interface.js';
import { CrawlerFactoryService } from '@crawler/crawler-factory.service.js';
import { SupabaseService } from '@common/supabase.service.js';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

const kuroshiro = new Kuroshiro.default();

@Injectable()
export class EpubService {
  private readonly logger = new Logger(EpubService.name);
  private kuroshiroInitialized = false; //
  constructor(
    @Inject(CrawlerFactoryService)
    private readonly crawlerFactoryService: CrawlerFactoryService,

    @Inject(SupabaseService)
    private readonly supabaseService: SupabaseService,
  ) {
    this.logger.log(
      `crawlerFactoryService: ${this.crawlerFactoryService?.constructor?.name}`,
    );
  }

  private async initKuroshiroIfNeeded() {
    if (!this.kuroshiroInitialized) {
      await kuroshiro.init(new KuromojiAnalyzer());
      this.kuroshiroInitialized = true;
      this.logger.log('Kuroshiro initialized!');
    }
  }

  private isRenderEnv(): boolean {
    return process.env.RENDER_INTERNAL_HOSTNAME !== undefined;
  }

  private getOutputDir(): string {
    if (this.isRenderEnv()) {
      return path.resolve(tmpdir(), 'epub');
    } else {
      return path.resolve(process.cwd(), 'output');
    }
  }

  async generateEpub(url: string): Promise<string> {
    try {
      if (!url) {
        throw new BadRequestException('請提供小說網址');
      }

      const crawler: CrawlerStrategy =
        this.crawlerFactoryService.getStrategy(url);

      const novelInfo: NovelData = await crawler.fetchNovelData(url);
      this.logger.log(`取得小說資料：${novelInfo.novelTitle}`);

      const content: { chapterTitle: string; title: string; data: string }[] =
        [];
      for (const chapter of novelInfo.chapters) {
        const chapterContent = await crawler.fetchChapterContent(chapter.url);
        content.push({
          chapterTitle: chapter.chapterTitle || '',
          title: chapter.title,
          data: chapterContent,
        });
      }

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const tocTemplatePath = join(
        __dirname,
        'templates',
        'custom-toc.xhtml.ejs',
      );

      const options = {
        title: novelInfo.novelTitle,
        author: novelInfo.novelAuthor,
        description: novelInfo.novelDescription,
        lang: 'ja',
        content,
        verbose: true,
        customHtmlTocTemplatePath: tocTemplatePath,
      };

      const outputDir = this.getOutputDir();
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        this.logger.log(`建立輸出資料夾：${outputDir}`);
      }

      // ⭐ 這裡是重點 → 初始化 + 轉羅馬拼音
      await this.initKuroshiroIfNeeded();
      const romanized = await kuroshiro.convert(novelInfo.novelTitle, {
        to: 'romaji',
        mode: 'spaced',
      });

      // ⭐ slug 處理：轉小寫 + 只留英數 + -
      const safeSlug = romanized.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

      const timestamp = Date.now();
      const fileName = `${safeSlug}-${timestamp}.epub`;
      const outputPath = join(outputDir, fileName);

      const epub = new MyEpub(options, outputPath);
      await epub.render();
      this.logger.log('EPUB generated successfully!');

      const publicUrl = await this.supabaseService.uploadFile(
        outputPath,
        fileName,
      );
      this.logger.log(`EPUB uploaded to Supabase: ${publicUrl}`);

      await fs.promises.unlink(outputPath);
      this.logger.log('Local temporary file deleted.');

      return publicUrl;
    } catch (error) {
      this.logger.error('An error occurred while generating EPUB', error);
      throw error;
    }
  }
}

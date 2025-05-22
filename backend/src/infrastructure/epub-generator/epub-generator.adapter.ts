// src/infrastructure/epub-generator/epub-generator.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import fs from 'fs';
import { tmpdir } from 'os';
import { MyEpub } from './custom-epub.js';
import { STORAGE_PORT_TOKEN, StoragePort } from '@domain/ports/storage.port.js';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import {
  EpubGeneratorPort,
  EpubMetadata,
} from '@/domain/ports/epub-generator.port.js';

const kuroshiro = new Kuroshiro.default();

@Injectable()
export class EpubGeneratorAdapter implements EpubGeneratorPort {
  private readonly logger = new Logger(EpubGeneratorAdapter.name);
  private kuroshiroInitialized = false;

  constructor(
    @Inject(STORAGE_PORT_TOKEN)
    private readonly storageService: StoragePort,
  ) {}

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

  /**
   * 生成 EPUB 檔案
   * @param metadata 小說完整元數據，包含標題、作者、描述和章節內容
   * @returns 生成的 EPUB 檔案的公開 URL
   */
  async generateEpub(metadata: EpubMetadata): Promise<{
    outputPath: string;
    fileName: string;
  }> {
    try {
      if (!metadata || !metadata.novelTitle) {
        throw new BadRequestException('無效的小說元數據');
      }

      this.logger.log(`準備生成 EPUB：${metadata.novelTitle}`);

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const tocTemplatePath = join(
        __dirname,
        'templates',
        'custom-toc.xhtml.ejs',
      );

      const opfTemplatePath = join(__dirname, 'templates', 'custom.opf.ejs');

      const options = {
        title: metadata.novelTitle,
        author: metadata.novelAuthor,
        description: metadata.novelDescription,
        lang: 'ja',
        content: metadata.chapters,
        verbose: false,
        customHtmlTocTemplatePath: tocTemplatePath,
        customOpfTemplatePath: opfTemplatePath,
      };

      const outputDir = this.getOutputDir();
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        this.logger.log(`建立輸出資料夾：${outputDir}`);
      }

      // 初始化 + 轉羅馬拼音
      await this.initKuroshiroIfNeeded();
      const romanized = await kuroshiro.convert(metadata.novelTitle, {
        to: 'romaji',
        mode: 'spaced',
      });

      // slug 處理：轉小寫 + 只留英數 + -
      const safeSlug = romanized.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

      const timestamp = Date.now();
      const fileName = `${safeSlug}-${timestamp}.epub`;
      const outputPath = join(outputDir, fileName);

      const epub = new MyEpub(options, outputPath);
      await epub.render();
      this.logger.log('EPUB 檔案生成成功!');

      return { outputPath, fileName };
    } catch (error) {
      this.logger.error('生成 EPUB 時發生錯誤', error);
      throw error;
    }
  }
}

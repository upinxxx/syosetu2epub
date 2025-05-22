// epub-generator.module.ts
import { Module } from '@nestjs/common';
import { StorageModule } from '@/infrastructure/storage/storage.module.js';
import { CrawlerModule } from '@/infrastructure/crawler/crawler.module.js';
import { EPUB_GENERATOR_TOKEN } from '@/domain/ports/epub-generator.port.js';
import { EpubGeneratorAdapter } from './epub-generator.adapter.js';
@Module({
  imports: [CrawlerModule, StorageModule],
  providers: [
    EpubGeneratorAdapter,
    {
      provide: EPUB_GENERATOR_TOKEN,
      useClass: EpubGeneratorAdapter,
    },
  ],
  exports: [EPUB_GENERATOR_TOKEN],
})
export class EpubGeneratorModule {}

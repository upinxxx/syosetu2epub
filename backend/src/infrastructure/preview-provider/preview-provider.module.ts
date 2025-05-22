import { Module } from '@nestjs/common';
import { NarouPreviewProvider } from './providers/narou-preview.provider.js';
import { KakuyomuPreviewProvider } from './providers/kakuyomu-preview.provider.js';
import { PreviewProviderFactoryService } from './preview-provider-factory.service.js';
import { PREVIEW_PROVIDER_FACTORY_TOKEN } from '@/domain/ports/preview-provider.factory.port.js';

/**
 * 預覽提供者模組 - 基礎設施層
 * 提供不同來源的小說爬蟲實現
 */
@Module({
  providers: [
    NarouPreviewProvider,
    KakuyomuPreviewProvider,
    PreviewProviderFactoryService,
    {
      provide: PREVIEW_PROVIDER_FACTORY_TOKEN,
      useExisting: PreviewProviderFactoryService,
    },
  ],
  exports: [PREVIEW_PROVIDER_FACTORY_TOKEN],
})
export class PreviewProviderModule {}

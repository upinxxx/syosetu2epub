import { Module } from '@nestjs/common';
import { NarouPreviewProvider } from './providers/narou-preview.provider.js';
import { KakuyomuPreviewProvider } from './providers/kakuyomu-preview.provider.js';
import { PreviewProviderFactory } from './preview-provider-factory.js';
import { PREVIEW_PROVIDER_FACTORY_TOKEN } from '@/domain/ports/factory/preview-provider.factory.port.js';

/**
 * 預覽提供者模組 - 基礎設施層
 * 提供不同來源的小說爬蟲實現
 */
@Module({
  providers: [
    NarouPreviewProvider,
    KakuyomuPreviewProvider,
    PreviewProviderFactory,
    {
      provide: PREVIEW_PROVIDER_FACTORY_TOKEN,
      useExisting: PreviewProviderFactory,
    },
  ],
  exports: [PREVIEW_PROVIDER_FACTORY_TOKEN],
})
export class PreviewProviderModule {}

// preview-provider-factory.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PreviewProviderPort } from '../../domain/ports/preview-provider.port.js';
import { NarouPreviewProvider } from './providers/narou-preview.provider.js';
import { KakuyomuPreviewProvider } from './providers/kakuyomu-preview.provider.js';
import { PreviewProviderFactoryPort } from '@/domain/ports/factory/preview-provider.factory.port.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';

/**
 * 預覽提供者工廠服務
 * 實現 PreviewProviderPort 介面，並依據 URL 選擇合適的具體實現
 */
@Injectable()
export class PreviewProviderFactory implements PreviewProviderFactoryPort {
  private readonly logger = new Logger(PreviewProviderFactory.name);
  private readonly providers: PreviewProviderPort[] = [];

  constructor(
    @Inject(NarouPreviewProvider)
    private readonly narouPreviewProvider: NarouPreviewProvider,
    @Inject(KakuyomuPreviewProvider)
    private readonly kakuyomuPreviewProvider: KakuyomuPreviewProvider,
  ) {
    // 註冊所有支援的預覽提供者
    this.providers = [this.narouPreviewProvider, this.kakuyomuPreviewProvider];
    this.logger.log(`已註冊 ${this.providers.length} 個預覽提供者`);

    // 輸出每個提供者的名稱，確認是否正確註冊
    this.providers.forEach((provider, index) => {
      this.logger.log(`提供者 #${index + 1}: ${provider.constructor.name}`);
    });

    // 檢查關鍵提供者是否存在
    if (!this.narouPreviewProvider) {
      this.logger.error('警告: NarouPreviewProvider 未正確注入!');
    }
    if (!this.kakuyomuPreviewProvider) {
      this.logger.error('警告: KakuyomuPreviewProvider 未正確注入!');
    }
  }

  /**
   * 獲取適合的提供者
   * @param url 小說 URL
   */
  getProvider(source: NovelSource): PreviewProviderPort {
    switch (source) {
      case NovelSource.NAROU:
        return this.narouPreviewProvider;
      case NovelSource.KAKUYOMU:
        return this.kakuyomuPreviewProvider;
      default:
        throw new Error(`不支援的小說網站: ${source}`);
    }
  }
}

// src/infrastructure/preview-provider/providers/narou-preview.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { PreviewProviderPort, NovelIndex } from '@domain/ports/index.js';
import { fetchNovelInfo } from '../adapters/narou-preview.adapter.js';
import {
  buildNarouApiUrl,
  buildNovelUrl,
} from '@/infrastructure/utils/url-builder.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
/**
 * 小說家になろう(Narou)預覽服務實現
 * 實現 PreviewProviderPort 介面，專門處理 ncode.syosetu.com 網站的小說
 */
@Injectable()
export class NarouPreviewProvider implements PreviewProviderPort {
  private readonly logger = new Logger(NarouPreviewProvider.name);

  /**
   * 獲取小說基本信息，標題、作者、描述（不含章節列表）
   * @param sourceId 小說 ID
   */
  async fetchNovelInfo(sourceId: string): Promise<NovelIndex> {
    this.logger.log(`開始獲取小說家になろう小說: ${sourceId}`);

    try {
      // 使用 API 獲取小說基本資訊
      const url = buildNarouApiUrl(sourceId);
      const novelData: NovelIndex = await fetchNovelInfo(url);

      if (!novelData) {
        throw new Error('回傳空數據');
      }
      this.logger.debug(`成功獲取小說數據: ${novelData.novelTitle}`);

      return novelData;
    } catch (error) {
      this.logger.error(`獲取小說資訊失敗: ${error.message}`);
      throw new Error(`獲取小說資訊失敗: ${error.message}`);
    }
  }
}

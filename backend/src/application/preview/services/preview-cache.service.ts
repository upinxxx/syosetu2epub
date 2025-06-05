import { Injectable, Inject, Logger } from '@nestjs/common';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import {
  PreviewCachePort,
  PreviewData,
  PreviewCacheStats,
  PREVIEW_CACHE_TOKEN,
} from '@/domain/ports/cache/preview-cache.port.js';

/**
 * 預覽緩存服務
 * Application Layer 服務，協調預覽緩存操作
 */
@Injectable()
export class PreviewCacheService {
  private readonly logger = new Logger(PreviewCacheService.name);
  private readonly DEFAULT_TTL_SECONDS = 900; // 15 分鐘

  constructor(
    @Inject(PREVIEW_CACHE_TOKEN)
    private readonly cacheAdapter: PreviewCachePort,
  ) {}

  /**
   * 獲取緩存的預覽資料
   */
  async getCachedPreview(
    source: NovelSource,
    sourceId: string,
  ): Promise<PreviewData | null> {
    const startTime = Date.now();

    try {
      this.logger.debug(`檢查預覽緩存: ${source}:${sourceId}`);

      const cachedData = await this.cacheAdapter.getCachedPreview(
        source,
        sourceId,
      );

      const responseTime = Date.now() - startTime;

      if (cachedData) {
        // 🆕 結構化日誌
        this.logger.debug('緩存命中', {
          source,
          sourceId,
          responseTime,
        });

        return cachedData;
      } else {
        // 🆕 結構化日誌
        this.logger.debug('緩存未命中', {
          source,
          sourceId,
          responseTime,
        });

        return null;
      }
    } catch (error) {
      // 🆕 結構化錯誤日誌
      this.logger.error('獲取預覽緩存失敗', {
        source,
        sourceId,
        error: error.message,
        stack: error.stack,
      });

      return null;
    }
  }

  /**
   * 設置預覽緩存
   */
  async setCachedPreview(
    source: NovelSource,
    sourceId: string,
    preview: Omit<PreviewData, 'cachedAt'>,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const previewWithCache: PreviewData = {
        ...preview,
        cachedAt: new Date(),
      };

      const ttl = ttlSeconds || this.DEFAULT_TTL_SECONDS;

      await this.cacheAdapter.setCachedPreview(
        source,
        sourceId,
        previewWithCache,
        ttl,
      );

      this.logger.debug(`已設置預覽緩存: ${source}:${sourceId}, TTL: ${ttl}秒`);
    } catch (error) {
      this.logger.error(`設置預覽緩存失敗: ${source}:${sourceId}`, error.stack);
      // 緩存設置失敗不應影響主流程
    }
  }

  /**
   * 檢查緩存是否存在
   */
  async hasCachedPreview(
    source: NovelSource,
    sourceId: string,
  ): Promise<boolean> {
    try {
      return await this.cacheAdapter.hasCachedPreview(source, sourceId);
    } catch (error) {
      this.logger.error(
        `檢查預覽緩存存在性失敗: ${source}:${sourceId}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 刪除指定的預覽緩存
   */
  async deleteCachedPreview(
    source: NovelSource,
    sourceId: string,
  ): Promise<void> {
    try {
      await this.cacheAdapter.deleteCachedPreview(source, sourceId);
      this.logger.debug(`已刪除預覽緩存: ${source}:${sourceId}`);
    } catch (error) {
      this.logger.error(`刪除預覽緩存失敗: ${source}:${sourceId}`, error.stack);
    }
  }

  /**
   * 清理過期的緩存
   */
  async cleanExpiredCache(): Promise<void> {
    try {
      await this.cacheAdapter.cleanExpiredCache();
      this.logger.debug('已清理過期的預覽緩存');
    } catch (error) {
      this.logger.error('清理過期預覽緩存失敗', error.stack);
    }
  }
}

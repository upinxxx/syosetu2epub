import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import {
  PreviewCachePort,
  PreviewData,
} from '@/domain/ports/cache/preview-cache.port.js';

/**
 * 預覽緩存適配器
 * Infrastructure Layer 實作，使用統一的 Redis 服務提供緩存功能
 */
@Injectable()
export class PreviewCacheAdapter implements PreviewCachePort {
  private readonly logger = new Logger(PreviewCacheAdapter.name);
  private readonly CACHE_KEY_PREFIX = 'preview:cache:';
  private readonly STATS_KEY_PREFIX = 'preview:stats:';

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    this.logger.log('預覽緩存適配器已初始化（使用統一 Redis 服務）');
  }

  /**
   * 獲取緩存的預覽資料
   */
  async getCachedPreview(
    source: NovelSource,
    sourceId: string,
  ): Promise<PreviewData | null> {
    try {
      const cacheKey = this.buildCacheKey(source, sourceId);
      this.logger.debug(`獲取緩存鍵: ${cacheKey}`);

      const cachedData = await this.redis.get(cacheKey);

      if (!cachedData) {
        this.logger.debug(`緩存未命中: ${cacheKey}`);
        return null;
      }

      const preview = JSON.parse(cachedData) as PreviewData;

      // 恢復 Date 對象
      if (preview.cachedAt && typeof preview.cachedAt === 'string') {
        preview.cachedAt = new Date(preview.cachedAt);
      }

      this.logger.debug(`緩存命中: ${cacheKey}, 緩存時間: ${preview.cachedAt}`);
      return preview;
    } catch (error) {
      this.logger.error(`獲取預覽緩存失敗: ${source}:${sourceId}`, error.stack);
      return null;
    }
  }

  /**
   * 設置預覽緩存
   */
  async setCachedPreview(
    source: NovelSource,
    sourceId: string,
    preview: PreviewData,
    ttlSeconds: number = 900, // 默認 15 分鐘
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(source, sourceId);
      const serializedData = JSON.stringify(preview);

      await this.redis.setex(cacheKey, ttlSeconds, serializedData);

      this.logger.debug(`已設置預覽緩存: ${cacheKey}, TTL: ${ttlSeconds}秒`);

      // 記錄緩存設置統計
      await this.recordCacheSet(source);
    } catch (error) {
      this.logger.error(`設置預覽緩存失敗: ${source}:${sourceId}`, error.stack);
      throw error;
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
      const cacheKey = this.buildCacheKey(source, sourceId);
      const result = await this.redis.del(cacheKey);

      if (result > 0) {
        this.logger.debug(`已刪除預覽緩存: ${cacheKey}`);
      } else {
        this.logger.debug(`緩存不存在，無需刪除: ${cacheKey}`);
      }
    } catch (error) {
      this.logger.error(`刪除預覽緩存失敗: ${source}:${sourceId}`, error.stack);
      throw error;
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
      const cacheKey = this.buildCacheKey(source, sourceId);
      const exists = await this.redis.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(
        `檢查預覽緩存存在性失敗: ${source}:${sourceId}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 清理過期的緩存
   * 注：Redis 會自動清理過期鍵，此方法主要用於手動清理和統計
   */
  async cleanExpiredCache(): Promise<void> {
    try {
      // 掃描所有預覽緩存鍵
      const pattern = `${this.CACHE_KEY_PREFIX}*`;
      const keys = await this.scanKeys(pattern);

      let cleanedCount = 0;
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -2) {
          // 鍵已過期但仍存在，手動刪除
          await this.redis.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug(`手動清理了 ${cleanedCount} 個過期的預覽緩存`);
      }
    } catch (error) {
      this.logger.error('清理過期預覽緩存失敗', error.stack);
      throw error;
    }
  }

  /**
   * 獲取所有緩存鍵的數量
   */
  async getCacheCount(): Promise<number> {
    try {
      const pattern = `${this.CACHE_KEY_PREFIX}*`;
      const keys = await this.scanKeys(pattern);
      return keys.length;
    } catch (error) {
      this.logger.error('獲取緩存數量失敗', error.stack);
      return 0;
    }
  }

  /**
   * 獲取緩存大小（字節估算）
   */
  async getCacheSize(): Promise<number> {
    try {
      const pattern = `${this.CACHE_KEY_PREFIX}*`;
      const keys = await this.scanKeys(pattern);

      let totalSize = 0;
      for (const key of keys) {
        try {
          // 獲取字符串長度作為大小估算
          const value = await this.redis.get(key);
          if (value) {
            totalSize += Buffer.byteLength(value, 'utf8');
          }
        } catch (error) {
          // 單個鍵獲取失敗不影響總體統計
          this.logger.debug(`獲取鍵 ${key} 大小失敗: ${error.message}`);
        }
      }

      return totalSize;
    } catch (error) {
      this.logger.error('獲取緩存大小失敗', error.stack);
      return 0;
    }
  }

  /**
   * 建立緩存鍵
   */
  private buildCacheKey(source: NovelSource, sourceId: string): string {
    return `${this.CACHE_KEY_PREFIX}${source}:${sourceId}`;
  }

  /**
   * 掃描 Redis 鍵
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * 記錄緩存設置統計
   */
  private async recordCacheSet(source: NovelSource): Promise<void> {
    try {
      const statsKey = `${this.STATS_KEY_PREFIX}set:${source}`;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dailyStatsKey = `${statsKey}:${today}`;

      // 增加總設置計數和日設置計數
      await Promise.all([
        this.redis.incr(statsKey),
        this.redis.incr(dailyStatsKey),
        this.redis.expire(dailyStatsKey, 86400 * 7), // 保留 7 天的日統計
      ]);
    } catch (error) {
      // 統計錯誤不應影響主流程
      this.logger.debug(`記錄緩存統計失敗: ${error.message}`);
    }
  }
}

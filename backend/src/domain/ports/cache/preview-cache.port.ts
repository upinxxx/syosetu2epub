import { NovelSource } from '@/domain/enums/novel-source.enum.js';

/**
 * 預覽緩存 Port
 * 定義預覽結果緩存的介面契約
 */
export interface PreviewCachePort {
  /**
   * 獲取緩存的預覽資料
   * @param source 小說來源
   * @param sourceId 來源 ID
   * @returns 預覽資料或 null（如果未命中）
   */
  getCachedPreview(
    source: NovelSource,
    sourceId: string,
  ): Promise<PreviewData | null>;

  /**
   * 設置預覽緩存
   * @param source 小說來源
   * @param sourceId 來源 ID
   * @param preview 預覽資料
   * @param ttlSeconds 緩存存活時間（秒）
   */
  setCachedPreview(
    source: NovelSource,
    sourceId: string,
    preview: PreviewData,
    ttlSeconds?: number,
  ): Promise<void>;

  /**
   * 刪除指定的預覽緩存
   * @param source 小說來源
   * @param sourceId 來源 ID
   */
  deleteCachedPreview(source: NovelSource, sourceId: string): Promise<void>;

  /**
   * 檢查緩存是否存在
   * @param source 小說來源
   * @param sourceId 來源 ID
   */
  hasCachedPreview(source: NovelSource, sourceId: string): Promise<boolean>;

  /**
   * 清理過期的緩存
   */
  cleanExpiredCache(): Promise<void>;
}

/**
 * 預覽資料結構
 */
export interface PreviewData {
  novelId: string;
  title: string;
  author: string;
  description: string;
  source: NovelSource;
  sourceId: string;
  cachedAt: Date;
}

/**
 * 預覽緩存統計資料
 */
export interface PreviewCacheStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  averageResponseTime: number;
}

/**
 * 預覽緩存 Port Token
 */
export const PREVIEW_CACHE_TOKEN = Symbol('PreviewCache');

import { Injectable, Inject, Logger } from '@nestjs/common';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import {
  PreviewCachePort,
  PreviewData,
  PreviewCacheStats,
  PREVIEW_CACHE_TOKEN,
} from '@/domain/ports/services/preview-cache.port.js';

// 🆕 擴展的緩存統計介面
interface ExtendedCacheStats extends PreviewCacheStats {
  /** 最小響應時間 */
  minResponseTime: number;
  /** 最大響應時間 */
  maxResponseTime: number;
  /** 最近一小時的命中率 */
  hourlyHitRate: number;
  /** 緩存大小估計 */
  estimatedCacheSize: number;
  /** 錯誤次數 */
  errorCount: number;
  /** 最後統計時間 */
  lastStatsTime: Date;
  /** 每小時請求數 */
  requestsPerHour: number;
}

// 🆕 性能監控資料點
interface PerformanceDataPoint {
  timestamp: Date;
  responseTime: number;
  isHit: boolean;
  source: NovelSource;
  sourceId: string;
}

/**
 * 預覽緩存服務
 * Application Layer 服務，協調預覽緩存操作
 */
@Injectable()
export class PreviewCacheService {
  private readonly logger = new Logger(PreviewCacheService.name);
  private readonly DEFAULT_TTL_SECONDS = 900; // 15 分鐘

  // 🆕 擴展的統計資料
  private stats: ExtendedCacheStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    averageResponseTime: 0,
    minResponseTime: Number.MAX_VALUE,
    maxResponseTime: 0,
    hourlyHitRate: 0,
    estimatedCacheSize: 0,
    errorCount: 0,
    lastStatsTime: new Date(),
    requestsPerHour: 0,
  };

  // 🆕 性能監控資料（保留最近 1000 個資料點）
  private performanceData: PerformanceDataPoint[] = [];
  private readonly maxPerformanceDataPoints = 1000;

  // 🆕 每小時統計資料
  private hourlyStats = {
    requests: 0,
    hits: 0,
    startTime: new Date(),
  };

  constructor(
    @Inject(PREVIEW_CACHE_TOKEN)
    private readonly cacheAdapter: PreviewCachePort,
  ) {
    // 🆕 啟動定期監控報告
    this.startPeriodicMonitoring();
  }

  /**
   * 獲取緩存的預覽資料
   */
  async getCachedPreview(
    source: NovelSource,
    sourceId: string,
  ): Promise<PreviewData | null> {
    const startTime = Date.now();
    this.stats.totalRequests++;
    this.hourlyStats.requests++;

    try {
      this.logger.debug(`檢查預覽緩存: ${source}:${sourceId}`);

      const cachedData = await this.cacheAdapter.getCachedPreview(
        source,
        sourceId,
      );

      const responseTime = Date.now() - startTime;
      const isHit = !!cachedData;

      // 🆕 記錄性能資料點
      this.recordPerformanceData({
        timestamp: new Date(),
        responseTime,
        isHit,
        source,
        sourceId,
      });

      this.updateResponseTime(responseTime);

      if (cachedData) {
        this.stats.cacheHits++;
        this.hourlyStats.hits++;
        this.updateHitRate();

        // 🆕 結構化日誌
        this.logger.debug('緩存命中', {
          source,
          sourceId,
          responseTime,
          hitRate: this.stats.hitRate.toFixed(2),
          totalRequests: this.stats.totalRequests,
        });

        return cachedData;
      } else {
        this.stats.cacheMisses++;
        this.updateHitRate();

        // 🆕 結構化日誌
        this.logger.debug('緩存未命中', {
          source,
          sourceId,
          responseTime,
          hitRate: this.stats.hitRate.toFixed(2),
          totalRequests: this.stats.totalRequests,
        });

        return null;
      }
    } catch (error) {
      this.stats.errorCount++;
      this.stats.cacheMisses++;
      this.updateHitRate();

      // 🆕 結構化錯誤日誌
      this.logger.error('獲取預覽緩存失敗', {
        source,
        sourceId,
        error: error.message,
        errorCount: this.stats.errorCount,
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

  /**
   * 🆕 獲取擴展的緩存統計資料
   */
  getExtendedCacheStats(): ExtendedCacheStats {
    this.updateHourlyStats();
    this.updateEstimatedCacheSize();
    return { ...this.stats };
  }

  /**
   * 🆕 獲取性能趨勢資料
   */
  getPerformanceTrends(): {
    recentResponseTimes: number[];
    recentHitRates: number[];
    timeLabels: string[];
  } {
    const recentData = this.performanceData.slice(-50); // 最近 50 個資料點

    return {
      recentResponseTimes: recentData.map((d) => d.responseTime),
      recentHitRates: this.calculateSlidingHitRates(recentData),
      timeLabels: recentData.map((d) => d.timestamp.toISOString()),
    };
  }

  /**
   * 🆕 記錄性能資料點
   */
  private recordPerformanceData(dataPoint: PerformanceDataPoint): void {
    this.performanceData.push(dataPoint);

    // 保持資料點數量在限制內
    if (this.performanceData.length > this.maxPerformanceDataPoints) {
      this.performanceData = this.performanceData.slice(
        -this.maxPerformanceDataPoints,
      );
    }
  }

  /**
   * 🆕 計算滑動命中率
   */
  private calculateSlidingHitRates(data: PerformanceDataPoint[]): number[] {
    const windowSize = 10; // 10 個請求的滑動窗口
    const hitRates: number[] = [];

    for (let i = windowSize - 1; i < data.length; i++) {
      const window = data.slice(i - windowSize + 1, i + 1);
      const hits = window.filter((d) => d.isHit).length;
      const hitRate = (hits / windowSize) * 100;
      hitRates.push(hitRate);
    }

    return hitRates;
  }

  /**
   * 🆕 更新每小時統計
   */
  private updateHourlyStats(): void {
    const now = new Date();
    const hoursSinceStart =
      (now.getTime() - this.hourlyStats.startTime.getTime()) / (1000 * 60 * 60);

    if (hoursSinceStart >= 1) {
      // 計算每小時請求數
      this.stats.requestsPerHour = this.hourlyStats.requests / hoursSinceStart;

      // 計算每小時命中率
      this.stats.hourlyHitRate =
        this.hourlyStats.requests > 0
          ? (this.hourlyStats.hits / this.hourlyStats.requests) * 100
          : 0;

      // 重置每小時統計（如果超過 24 小時）
      if (hoursSinceStart >= 24) {
        this.hourlyStats = {
          requests: 0,
          hits: 0,
          startTime: now,
        };
      }
    }
  }

  /**
   * 🆕 更新緩存大小估計
   */
  private updateEstimatedCacheSize(): void {
    // 基於命中次數估計緩存中的項目數量
    // 這是一個簡化的估計，實際實作可能需要查詢 Redis
    this.stats.estimatedCacheSize = Math.min(
      this.stats.cacheHits,
      this.stats.totalRequests,
    );
  }

  /**
   * 🆕 啟動定期監控報告
   */
  private startPeriodicMonitoring(): void {
    // 每 10 分鐘記錄一次統計資料
    setInterval(() => {
      this.logDetailedStats();
    }, 600000); // 10 分鐘

    // 每小時記錄一次性能報告
    setInterval(() => {
      this.logPerformanceReport();
    }, 3600000); // 1 小時

    this.logger.log('預覽緩存定期監控已啟動');
  }

  /**
   * 🆕 記錄詳細統計資料
   */
  private logDetailedStats(): void {
    this.updateHourlyStats();
    this.updateEstimatedCacheSize();

    const stats = this.getExtendedCacheStats();

    // 結構化日誌輸出
    this.logger.log('預覽緩存詳細統計', {
      totalRequests: stats.totalRequests,
      cacheHits: stats.cacheHits,
      cacheMisses: stats.cacheMisses,
      hitRate: stats.hitRate.toFixed(2) + '%',
      hourlyHitRate: stats.hourlyHitRate.toFixed(2) + '%',
      averageResponseTime: stats.averageResponseTime.toFixed(2) + 'ms',
      minResponseTime: stats.minResponseTime + 'ms',
      maxResponseTime: stats.maxResponseTime + 'ms',
      requestsPerHour: stats.requestsPerHour.toFixed(1),
      estimatedCacheSize: stats.estimatedCacheSize,
      errorCount: stats.errorCount,
      lastStatsTime: stats.lastStatsTime.toISOString(),
    });
  }

  /**
   * 🆕 記錄性能報告
   */
  private logPerformanceReport(): void {
    const trends = this.getPerformanceTrends();
    const recentAvgResponseTime =
      trends.recentResponseTimes.length > 0
        ? trends.recentResponseTimes.reduce((a, b) => a + b, 0) /
          trends.recentResponseTimes.length
        : 0;

    const recentAvgHitRate =
      trends.recentHitRates.length > 0
        ? trends.recentHitRates.reduce((a, b) => a + b, 0) /
          trends.recentHitRates.length
        : 0;

    this.logger.log('預覽緩存性能報告', {
      reportType: 'hourly_performance',
      recentAverageResponseTime: recentAvgResponseTime.toFixed(2) + 'ms',
      recentAverageHitRate: recentAvgHitRate.toFixed(2) + '%',
      dataPointsAnalyzed: trends.recentResponseTimes.length,
      performanceStatus: this.getPerformanceStatus(),
      recommendations: this.getPerformanceRecommendations(),
    });
  }

  /**
   * 🆕 獲取性能狀態
   */
  private getPerformanceStatus(): string {
    const stats = this.getExtendedCacheStats();

    if (stats.hitRate >= 70 && stats.averageResponseTime <= 500) {
      return 'excellent';
    } else if (stats.hitRate >= 50 && stats.averageResponseTime <= 1000) {
      return 'good';
    } else if (stats.hitRate >= 30 && stats.averageResponseTime <= 2000) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * 🆕 獲取性能建議
   */
  private getPerformanceRecommendations(): string[] {
    const stats = this.getExtendedCacheStats();
    const recommendations: string[] = [];

    if (stats.hitRate < 50) {
      recommendations.push('考慮增加緩存 TTL 時間');
      recommendations.push('檢查緩存鍵的一致性');
    }

    if (stats.averageResponseTime > 1000) {
      recommendations.push('檢查 Redis 連接性能');
      recommendations.push('考慮優化緩存資料結構');
    }

    if (stats.errorCount > stats.totalRequests * 0.05) {
      recommendations.push('檢查緩存適配器錯誤處理');
      recommendations.push('監控 Redis 服務狀態');
    }

    if (recommendations.length === 0) {
      recommendations.push('緩存性能良好，繼續監控');
    }

    return recommendations;
  }

  /**
   * 🆕 更新命中率
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate =
        (this.stats.cacheHits / this.stats.totalRequests) * 100;
    }
  }

  /**
   * 獲取緩存統計資料（向後相容）
   */
  getCacheStats(): PreviewCacheStats {
    return {
      totalRequests: this.stats.totalRequests,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      hitRate: this.stats.hitRate,
      averageResponseTime: this.stats.averageResponseTime,
    };
  }

  /**
   * 重置統計資料
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      averageResponseTime: 0,
      minResponseTime: Number.MAX_VALUE,
      maxResponseTime: 0,
      hourlyHitRate: 0,
      estimatedCacheSize: 0,
      errorCount: 0,
      lastStatsTime: new Date(),
      requestsPerHour: 0,
    };

    // 重置性能資料和每小時統計
    this.performanceData = [];
    this.hourlyStats = {
      requests: 0,
      hits: 0,
      startTime: new Date(),
    };

    this.logger.debug('已重置預覽緩存統計資料');
  }

  /**
   * 記錄緩存統計資料（向後相容）
   */
  logStats(): void {
    this.logger.log(
      `預覽緩存統計 - 總請求: ${this.stats.totalRequests}, ` +
        `命中: ${this.stats.cacheHits}, 未命中: ${this.stats.cacheMisses}, ` +
        `命中率: ${this.stats.hitRate.toFixed(2)}%, ` +
        `平均響應時間: ${this.stats.averageResponseTime.toFixed(2)}ms`,
    );
  }

  /**
   * 更新平均響應時間
   */
  private updateResponseTime(responseTime: number): void {
    // 🆕 更新最小和最大響應時間
    this.stats.minResponseTime = Math.min(
      this.stats.minResponseTime,
      responseTime,
    );
    this.stats.maxResponseTime = Math.max(
      this.stats.maxResponseTime,
      responseTime,
    );

    // 更新平均響應時間
    const currentTotalTime =
      this.stats.averageResponseTime * (this.stats.totalRequests - 1);
    this.stats.averageResponseTime =
      (currentTotalTime + responseTime) / this.stats.totalRequests;

    // 🆕 更新最後統計時間
    this.stats.lastStatsTime = new Date();
  }
}

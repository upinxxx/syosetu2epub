import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

// 🆕 性能指標接口
interface PerformanceMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  userId?: string;
  requestSize?: number;
  responseSize?: number;
}

// 🆕 性能統計
interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  errorRequests: number;
  requestsPerMinute: number;
  lastResetTime: Date;
}

@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceMonitoringInterceptor.name);

  // 🆕 性能指標存儲（生產環境應使用 Redis 或數據庫）
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsCount = 10000; // 最多保存 10000 條記錄

  // 🆕 實時統計
  private stats: PerformanceStats = {
    totalRequests: 0,
    averageResponseTime: 0,
    slowRequests: 0,
    errorRequests: 0,
    requestsPerMinute: 0,
    lastResetTime: new Date(),
  };

  // 🆕 慢請求閾值（毫秒）
  private readonly slowRequestThreshold = 2000;

  constructor() {
    // 🆕 啟動定期統計報告
    this.startPeriodicReporting();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // 🆕 獲取請求信息
    const endpoint = request.route?.path || request.url;
    const method = request.method;
    const userAgent = request.get('User-Agent');
    const ip = request.ip || request.connection.remoteAddress;
    const userId = (request as any).user?.id;
    const requestSize = this.getRequestSize(request);

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.recordMetrics({
            endpoint,
            method,
            statusCode: response.statusCode,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
            userAgent,
            ip,
            userId,
            requestSize,
            responseSize: this.getResponseSize(data),
          });
        },
        error: (error) => {
          this.recordMetrics({
            endpoint,
            method,
            statusCode: response.statusCode || 500,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
            userAgent,
            ip,
            userId,
            requestSize,
            responseSize: 0,
          });

          // 🆕 記錄錯誤詳情
          this.logger.error('API 請求錯誤', {
            endpoint,
            method,
            statusCode: response.statusCode || 500,
            responseTime: Date.now() - startTime,
            error: error.message,
            stack: error.stack,
            userId,
            ip,
          });
        },
      }),
    );
  }

  // 🆕 記錄性能指標
  private recordMetrics(metrics: PerformanceMetrics): void {
    // 添加到指標列表
    this.metrics.push(metrics);

    // 限制指標數量
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics = this.metrics.slice(-this.maxMetricsCount);
    }

    // 更新統計
    this.updateStats(metrics);

    // 🆕 檢查慢請求
    if (metrics.responseTime > this.slowRequestThreshold) {
      this.logger.warn('慢請求檢測', {
        endpoint: metrics.endpoint,
        method: metrics.method,
        responseTime: `${metrics.responseTime}ms`,
        threshold: `${this.slowRequestThreshold}ms`,
        userId: metrics.userId,
        statusCode: metrics.statusCode,
      });
    }

    // 🆕 檢查錯誤請求
    if (metrics.statusCode >= 400) {
      this.logger.warn('錯誤請求檢測', {
        endpoint: metrics.endpoint,
        method: metrics.method,
        statusCode: metrics.statusCode,
        responseTime: `${metrics.responseTime}ms`,
        userId: metrics.userId,
      });
    }
  }

  // 🆕 更新統計信息
  private updateStats(metrics: PerformanceMetrics): void {
    this.stats.totalRequests++;

    // 更新平均響應時間
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) +
        metrics.responseTime) /
      this.stats.totalRequests;

    // 更新慢請求計數
    if (metrics.responseTime > this.slowRequestThreshold) {
      this.stats.slowRequests++;
    }

    // 更新錯誤請求計數
    if (metrics.statusCode >= 400) {
      this.stats.errorRequests++;
    }

    // 計算每分鐘請求數
    const timeDiff = Date.now() - this.stats.lastResetTime.getTime();
    this.stats.requestsPerMinute =
      (this.stats.totalRequests / timeDiff) * 60000;
  }

  // 🆕 獲取請求大小
  private getRequestSize(request: Request): number {
    const contentLength = request.get('Content-Length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }

    // 估算請求大小
    if (request.body) {
      try {
        return JSON.stringify(request.body).length;
      } catch {
        return 0;
      }
    }

    return 0;
  }

  // 🆕 獲取響應大小
  private getResponseSize(data: any): number {
    if (!data) return 0;

    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  // 🆕 啟動定期統計報告
  private startPeriodicReporting(): void {
    // 每5分鐘報告一次性能統計
    setInterval(
      () => {
        this.reportPerformanceStats();
      },
      5 * 60 * 1000,
    );

    // 每小時重置統計
    setInterval(
      () => {
        this.resetStats();
      },
      60 * 60 * 1000,
    );
  }

  // 🆕 報告性能統計
  private reportPerformanceStats(): void {
    if (this.stats.totalRequests === 0) return;

    const errorRate =
      (this.stats.errorRequests / this.stats.totalRequests) * 100;
    const slowRequestRate =
      (this.stats.slowRequests / this.stats.totalRequests) * 100;

    this.logger.log('API 性能統計報告', {
      reportType: 'performance_summary',
      totalRequests: this.stats.totalRequests,
      averageResponseTime: `${this.stats.averageResponseTime.toFixed(2)}ms`,
      requestsPerMinute: this.stats.requestsPerMinute.toFixed(2),
      errorRate: `${errorRate.toFixed(2)}%`,
      slowRequestRate: `${slowRequestRate.toFixed(2)}%`,
      slowRequests: this.stats.slowRequests,
      errorRequests: this.stats.errorRequests,
      uptime: Date.now() - this.stats.lastResetTime.getTime(),
    });

    // 🆕 生成性能建議
    const recommendations = this.generatePerformanceRecommendations();
    if (recommendations.length > 0) {
      this.logger.log('性能優化建議', {
        recommendations,
      });
    }

    // 🆕 報告熱門端點
    this.reportTopEndpoints();
  }

  // 🆕 生成性能建議
  private generatePerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const errorRate =
      (this.stats.errorRequests / this.stats.totalRequests) * 100;
    const slowRequestRate =
      (this.stats.slowRequests / this.stats.totalRequests) * 100;

    if (this.stats.averageResponseTime > 1000) {
      recommendations.push('平均響應時間過長，建議優化數據庫查詢和緩存策略');
    }

    if (errorRate > 5) {
      recommendations.push('錯誤率過高，建議檢查錯誤處理邏輯和輸入驗證');
    }

    if (slowRequestRate > 10) {
      recommendations.push('慢請求比例過高，建議分析慢請求端點並進行優化');
    }

    if (this.stats.requestsPerMinute > 1000) {
      recommendations.push('請求量較高，建議考慮負載均衡和水平擴展');
    }

    return recommendations;
  }

  // 🆕 報告熱門端點
  private reportTopEndpoints(): void {
    // 統計最近 1000 個請求的端點使用情況
    const recentMetrics = this.metrics.slice(-1000);
    const endpointStats = new Map<
      string,
      {
        count: number;
        totalResponseTime: number;
        errorCount: number;
      }
    >();

    recentMetrics.forEach((metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = endpointStats.get(key) || {
        count: 0,
        totalResponseTime: 0,
        errorCount: 0,
      };

      existing.count++;
      existing.totalResponseTime += metric.responseTime;
      if (metric.statusCode >= 400) {
        existing.errorCount++;
      }

      endpointStats.set(key, existing);
    });

    // 排序並取前10個
    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        averageResponseTime: stats.totalResponseTime / stats.count,
        errorRate: (stats.errorCount / stats.count) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    if (topEndpoints.length > 0) {
      this.logger.log('熱門 API 端點統計', {
        reportType: 'top_endpoints',
        endpoints: topEndpoints.map((ep) => ({
          endpoint: ep.endpoint,
          requests: ep.count,
          avgResponseTime: `${ep.averageResponseTime.toFixed(2)}ms`,
          errorRate: `${ep.errorRate.toFixed(2)}%`,
        })),
      });
    }
  }

  // 🆕 重置統計
  private resetStats(): void {
    this.logger.log('重置性能統計', {
      previousStats: { ...this.stats },
    });

    this.stats = {
      totalRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorRequests: 0,
      requestsPerMinute: 0,
      lastResetTime: new Date(),
    };
  }

  // 🆕 獲取當前性能統計（用於健康檢查端點）
  getPerformanceStats(): PerformanceStats & {
    recentMetrics: PerformanceMetrics[];
  } {
    return {
      ...this.stats,
      recentMetrics: this.metrics.slice(-100), // 最近 100 個請求
    };
  }

  // 🆕 獲取端點性能分析
  getEndpointAnalysis(endpoint?: string): Array<{
    endpoint: string;
    method: string;
    count: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    errorRate: number;
  }> {
    const filteredMetrics = endpoint
      ? this.metrics.filter((m) => m.endpoint === endpoint)
      : this.metrics;

    const endpointMap = new Map<string, PerformanceMetrics[]>();

    // 按端點分組
    filteredMetrics.forEach((metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, []);
      }
      endpointMap.get(key)!.push(metric);
    });

    // 計算統計信息
    return Array.from(endpointMap.entries()).map(([key, metrics]) => {
      const responseTimes = metrics.map((m) => m.responseTime);
      const errorCount = metrics.filter((m) => m.statusCode >= 400).length;

      return {
        endpoint: metrics[0].endpoint,
        method: metrics[0].method,
        count: metrics.length,
        averageResponseTime:
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        minResponseTime: Math.min(...responseTimes),
        maxResponseTime: Math.max(...responseTimes),
        errorRate: (errorCount / metrics.length) * 100,
      };
    });
  }
}

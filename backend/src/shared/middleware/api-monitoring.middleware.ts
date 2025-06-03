import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RequestWithStartTime extends Request {
  startTime?: number;
  requestId?: string;
}

@Injectable()
export class ApiMonitoringMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiMonitoringMiddleware.name);
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;

  use(req: RequestWithStartTime, res: Response, next: NextFunction) {
    // 生成請求 ID
    const requestId = this.generateRequestId();
    req.requestId = requestId;
    req.startTime = Date.now();

    // 增加請求計數
    this.requestCount++;

    // 記錄請求開始
    this.logger.debug(
      `[${requestId}] ${req.method} ${req.originalUrl} - 開始處理`,
    );

    // 監聽回應完成事件
    res.on('finish', () => {
      const responseTime = Date.now() - req.startTime!;
      this.totalResponseTime += responseTime;

      // 記錄錯誤
      if (res.statusCode >= 400) {
        this.errorCount++;
      }

      // 記錄請求完成
      const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';
      this.logger[logLevel](
        `[${requestId}] ${req.method} ${req.originalUrl} - ` +
          `狀態: ${res.statusCode}, 耗時: ${responseTime}ms`,
      );

      // 每 100 個請求記錄一次統計
      if (this.requestCount % 100 === 0) {
        this.logStatistics();
      }
    });

    // 監聽錯誤事件
    res.on('error', (error) => {
      this.errorCount++;
      this.logger.error(
        `[${requestId}] ${req.method} ${req.originalUrl} - 錯誤: ${error.message}`,
        error.stack,
      );
    });

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logStatistics() {
    const avgResponseTime = this.totalResponseTime / this.requestCount;
    const errorRate = (this.errorCount / this.requestCount) * 100;

    this.logger.log(
      `API 統計 - 總請求: ${this.requestCount}, ` +
        `錯誤率: ${errorRate.toFixed(2)}%, ` +
        `平均回應時間: ${avgResponseTime.toFixed(2)}ms`,
    );
  }

  // 獲取當前統計數據（用於健康檢查）
  getStatistics() {
    const avgResponseTime =
      this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;
    const errorRate =
      this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: parseFloat(errorRate.toFixed(2)),
      averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
      uptime: process.uptime(),
    };
  }

  // 重置統計數據
  resetStatistics() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.totalResponseTime = 0;
    this.logger.log('API 監控統計已重置');
  }
}

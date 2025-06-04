import { Injectable, Inject } from '@nestjs/common';
import {
  SystemHealthCheckUseCase,
  SystemHealthResult,
} from './use-cases/system-health-check.use-case.js';
import {
  DataConsistencyCheckUseCase,
  ConsistencyCheckResult,
} from './use-cases/data-consistency-check.use-case.js';
import {
  SystemMetricsUseCase,
  SystemMetricsResult,
} from './use-cases/system-metrics.use-case.js';

export interface QuickHealthResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  uptime: number;
}

/**
 * 健康檢查門面
 * 統一處理健康檢查相關功能，隱藏內部實現細節
 * 重構後：僅負責 Use Case 協調，移除橫切關注點
 */
@Injectable()
export class HealthFacade {
  private readonly startTime = Date.now();
  private lastHealthCheck: Date | null = null;

  constructor(
    @Inject(SystemHealthCheckUseCase)
    private readonly systemHealthCheck: SystemHealthCheckUseCase,
    @Inject(DataConsistencyCheckUseCase)
    private readonly dataConsistencyCheck: DataConsistencyCheckUseCase,
    @Inject(SystemMetricsUseCase)
    private readonly systemMetrics: SystemMetricsUseCase,
  ) {}

  /**
   * 執行完整的系統健康檢查
   */
  async checkSystemHealth(): Promise<SystemHealthResult> {
    const result = await this.systemHealthCheck.execute();
    this.lastHealthCheck = new Date();
    return result;
  }

  /**
   * 執行數據一致性檢查
   */
  async checkDataConsistency(): Promise<ConsistencyCheckResult> {
    return this.dataConsistencyCheck.execute();
  }

  /**
   * 快速健康檢查（僅基本指標）
   */
  async quickHealthCheck(): Promise<QuickHealthResult> {
    return {
      status: 'healthy',
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * 獲取系統指標
   */
  async getSystemMetrics(): Promise<
    SystemMetricsResult & { lastHealthCheck: Date | null }
  > {
    const metrics = await this.systemMetrics.execute();
    return {
      ...metrics,
      lastHealthCheck: this.lastHealthCheck,
    };
  }
}

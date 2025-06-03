import { Injectable, Logger, Inject } from '@nestjs/common';
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
 */
@Injectable()
export class HealthFacade {
  private readonly logger = new Logger(HealthFacade.name);
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
    this.logger.debug('執行完整系統健康檢查');

    try {
      const result = await this.systemHealthCheck.execute();
      this.lastHealthCheck = new Date();
      return result;
    } catch (error) {
      this.logger.error(`系統健康檢查失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 執行數據一致性檢查
   */
  async checkDataConsistency(): Promise<ConsistencyCheckResult> {
    this.logger.log('執行數據一致性檢查');

    try {
      return await this.dataConsistencyCheck.execute();
    } catch (error) {
      this.logger.error(`數據一致性檢查失敗: ${error.message}`, error.stack);
      throw error;
    }
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
    this.logger.debug('獲取系統指標');

    try {
      const metrics = await this.systemMetrics.execute();
      return {
        ...metrics,
        lastHealthCheck: this.lastHealthCheck,
      };
    } catch (error) {
      this.logger.error(`獲取系統指標失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}

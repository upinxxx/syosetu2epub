import { Controller, Get, Logger, Inject } from '@nestjs/common';
import {
  HealthFacade,
  QuickHealthResult,
} from '@/application/health/health.facade.js';
import { SystemHealthResult } from '@/application/health/use-cases/system-health-check.use-case.js';
import { ConsistencyCheckResult } from '@/application/health/use-cases/data-consistency-check.use-case.js';
import { SystemMetricsResult } from '@/application/health/use-cases/system-metrics.use-case.js';

/**
 * 健康檢查控制器
 * 提供系統健康檢查和監控指標端點
 * 遵循專案架構：僅依賴 Facade，不包含業務邏輯
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(HealthFacade)
    private readonly healthFacade: HealthFacade,
  ) {}

  /**
   * 基本健康檢查端點
   */
  @Get()
  async healthCheck(): Promise<SystemHealthResult> {
    this.logger.debug('健康檢查請求');

    try {
      return await this.healthFacade.checkSystemHealth();
    } catch (error) {
      this.logger.error(`健康檢查失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 詳細的數據一致性檢查端點
   */
  @Get('consistency')
  async consistencyCheck(): Promise<ConsistencyCheckResult> {
    this.logger.log('數據一致性檢查請求');

    try {
      return await this.healthFacade.checkDataConsistency();
    } catch (error) {
      this.logger.error(`一致性檢查失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 快速健康檢查端點（僅基本指標）
   */
  @Get('quick')
  async quickCheck(): Promise<QuickHealthResult> {
    return await this.healthFacade.quickHealthCheck();
  }

  /**
   * 系統指標端點
   */
  @Get('metrics')
  async getMetrics(): Promise<
    SystemMetricsResult & { lastHealthCheck: Date | null }
  > {
    this.logger.debug('系統指標查詢請求');

    try {
      return await this.healthFacade.getSystemMetrics();
    } catch (error) {
      this.logger.error(`獲取系統指標失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}

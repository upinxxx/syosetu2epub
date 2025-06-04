import { Controller, Get, Logger, Inject, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  HealthFacade,
  QuickHealthResult,
} from '@/application/health/health.facade.js';
import { SystemHealthResult } from '@/application/health/use-cases/system-health-check.use-case.js';
import { ConsistencyCheckResult } from '@/application/health/use-cases/data-consistency-check.use-case.js';
import { SystemMetricsResult } from '@/application/health/use-cases/system-metrics.use-case.js';
import { ApiMonitoringMiddleware } from '@/shared/middleware/api-monitoring.middleware.js';

/**
 * 健康檢查控制器
 * 提供基本的系統健康檢查端點（無 API 前綴）
 * 遵循六角架構：僅依賴 HealthFacade，無直接業務邏輯
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(HealthFacade)
    private readonly healthFacade: HealthFacade,
    @Inject(ApiMonitoringMiddleware)
    private readonly apiMonitoring: ApiMonitoringMiddleware,
  ) {}

  /**
   * 基本健康檢查端點
   * GET /health
   */
  @Get()
  async healthCheck(): Promise<SystemHealthResult & { apiStats?: any }> {
    this.logger.debug('健康檢查請求');

    try {
      const healthResult = await this.healthFacade.checkSystemHealth();

      // 添加 API 監控統計
      const apiStats = this.apiMonitoring.getStatistics();

      return {
        ...healthResult,
        apiStats,
      };
    } catch (error) {
      this.logger.error(`健康檢查失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 快速健康檢查端點（僅基本指標）
   * GET /health/quick
   */
  @Get('quick')
  async quickCheck(): Promise<QuickHealthResult> {
    this.logger.debug('快速健康檢查請求');
    return await this.healthFacade.quickHealthCheck();
  }

  /**
   * 詳細的數據一致性檢查端點
   * GET /health/consistency
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
}

/**
 * 健康檢查指標控制器
 * 提供需要認證的系統指標端點（有 API 前綴）
 * 遵循六角架構：僅依賴 HealthFacade，無直接業務邏輯
 */
@Controller('health')
export class HealthMetricsController {
  private readonly logger = new Logger(HealthMetricsController.name);

  constructor(
    @Inject(HealthFacade)
    private readonly healthFacade: HealthFacade,
    @Inject(ApiMonitoringMiddleware)
    private readonly apiMonitoring: ApiMonitoringMiddleware,
  ) {}

  /**
   * 系統指標端點（需要認證）
   * GET /api/v1/health/metrics
   */
  @Get('metrics')
  @UseGuards(AuthGuard('jwt'))
  async getMetrics(): Promise<
    SystemMetricsResult & {
      lastHealthCheck: Date | null;
      apiMonitoring: any;
    }
  > {
    this.logger.debug('系統指標查詢請求');

    try {
      const metrics = await this.healthFacade.getSystemMetrics();
      const apiStats = this.apiMonitoring.getStatistics();

      return {
        ...metrics,
        apiMonitoring: {
          ...apiStats,
          description: 'API 請求監控統計',
          lastReset: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`獲取系統指標失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 重置 API 監控統計
   * POST /api/v1/health/reset-stats
   */
  @Get('reset-stats')
  @UseGuards(AuthGuard('jwt'))
  async resetApiStats(): Promise<{ success: boolean; message: string }> {
    this.logger.log('重置 API 監控統計請求');

    try {
      this.apiMonitoring.resetStatistics();
      return {
        success: true,
        message: 'API 監控統計已重置',
      };
    } catch (error) {
      this.logger.error(`重置統計失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}

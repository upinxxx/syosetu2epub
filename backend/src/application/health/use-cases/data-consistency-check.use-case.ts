import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  DataConsistencyValidator,
  ConsistencyReport,
} from '@/application/jobs/data-consistency-validator.service.js';

export interface ConsistencyCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  report: ConsistencyReport;
}

/**
 * 數據一致性檢查用例
 * 負責執行數據一致性檢查並返回結果
 */
@Injectable()
export class DataConsistencyCheckUseCase {
  private readonly logger = new Logger(DataConsistencyCheckUseCase.name);

  constructor(
    @Inject(DataConsistencyValidator)
    private readonly dataConsistencyValidator: DataConsistencyValidator,
  ) {}

  /**
   * 執行數據一致性檢查
   */
  async execute(): Promise<ConsistencyCheckResult> {
    this.logger.log('執行數據一致性檢查');

    try {
      const report = await this.dataConsistencyValidator.validateConsistency();

      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

      if (report.inconsistentJobs > 0) {
        // 根據不一致任務的數量和嚴重程度判斷狀態
        const criticalIssues = report.details.filter(
          (d) => d.severity === 'CRITICAL',
        ).length;
        const highIssues = report.details.filter(
          (d) => d.severity === 'HIGH',
        ).length;

        if (criticalIssues > 0 || highIssues > 5) {
          status = 'unhealthy';
        } else if (report.inconsistentJobs > 10) {
          status = 'degraded';
        } else {
          status = 'degraded';
        }
      }

      return { status, report };
    } catch (error) {
      this.logger.error(`數據一致性檢查失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}

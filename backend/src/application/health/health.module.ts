import { Module } from '@nestjs/common';
import { SystemHealthCheckUseCase } from './use-cases/system-health-check.use-case.js';
import { DataConsistencyCheckUseCase } from './use-cases/data-consistency-check.use-case.js';
import { SystemMetricsUseCase } from './use-cases/system-metrics.use-case.js';
import { HealthFacade } from './health.facade.js';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module.js';
import { JobsModule } from '@/application/jobs/jobs.module.js';

/**
 * 健康檢查模組
 * 提供系統健康檢查、數據一致性驗證和系統指標查詢功能
 */
@Module({
  imports: [
    // 引入基礎設施模組，提供佇列和鎖服務
    InfrastructureModule,
    // 引入任務模組，提供數據一致性驗證器
    JobsModule,
  ],
  providers: [
    // 健康檢查相關用例
    {
      provide: SystemHealthCheckUseCase,
      useClass: SystemHealthCheckUseCase,
    },
    {
      provide: DataConsistencyCheckUseCase,
      useClass: DataConsistencyCheckUseCase,
    },
    {
      provide: SystemMetricsUseCase,
      useClass: SystemMetricsUseCase,
    },
    // Facade
    {
      provide: HealthFacade,
      useClass: HealthFacade,
    },
  ],
  exports: [
    // 僅導出 Facade
    HealthFacade,
  ],
})
export class HealthModule {}

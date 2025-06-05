import { Module } from '@nestjs/common';
import { JobStatusSyncService } from './service/job-status-sync.service.js';
import { DataConsistencyValidator } from './service/data-consistency-validator.service.js';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module.js';

/**
 * 任務模組
 * 提供任務狀態同步等功能
 */
@Module({
  imports: [
    // 引入基礎設施模組，提供儲存庫等依賴
    InfrastructureModule,
  ],
  providers: [
    // 任務狀態同步服務
    JobStatusSyncService,
    // 數據一致性驗證服務
    DataConsistencyValidator,
  ],
  exports: [
    // 導出任務狀態同步服務，供排程器使用
    JobStatusSyncService,
    // 導出數據一致性驗證服務
    DataConsistencyValidator,
  ],
})
export class JobsModule {}

import { Module } from '@nestjs/common';
import { JobStatusSyncService } from './job-status-sync.service.js';
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
  ],
  exports: [
    // 導出任務狀態同步服務，供排程器使用
    JobStatusSyncService,
  ],
})
export class JobsModule {}

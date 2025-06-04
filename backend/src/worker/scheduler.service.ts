import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobStatusSyncService } from '@/application/jobs/service/job-status-sync.service.js';
import { CleanupOldFilesUseCase } from '@/application/storage/cleanup-old-files.use-case.js';

/**
 * Worker 排程服務
 * 負責定期執行各種排程任務
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @Inject(JobStatusSyncService)
    private readonly jobStatusSyncService: JobStatusSyncService,
    @Inject(CleanupOldFilesUseCase)
    private readonly cleanupOldFilesUseCase: CleanupOldFilesUseCase,
  ) {}

  /**
   * 每小時同步一次任務狀態
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncJobStatuses() {
    this.logger.log('開始執行排程任務：同步任務狀態');
    try {
      await this.jobStatusSyncService.execute();
      this.logger.log('任務狀態同步完成');
    } catch (error) {
      this.logger.error(`任務狀態同步失敗: ${error.message}`, error.stack);
    }
  }

  /**
   * 每天凌晨 2 點清理過期檔案
   */
  @Cron('0 2 * * *') // 每天凌晨 2:00
  async cleanupOldFiles() {
    this.logger.log('開始執行排程任務：清理過期檔案');
    try {
      await this.cleanupOldFilesUseCase.execute(7); // 清理超過 7 天的檔案
      this.logger.log('過期檔案清理完成');
    } catch (error) {
      this.logger.error(`過期檔案清理失敗: ${error.message}`, error.stack);
    }
  }
}

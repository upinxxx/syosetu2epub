import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobStatusSyncService } from '@/application/jobs/job-status-sync.service.js';

/**
 * Worker 排程服務
 * 負責定期執行各種排程任務
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly jobStatusSyncService: JobStatusSyncService) {}

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
}

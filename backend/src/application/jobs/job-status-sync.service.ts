import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueuePort, QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { EPUB_JOB_REPOSITORY_TOKEN } from '@/domain/ports/repository/index.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';
import { EpubJobRepositoryTypeORM } from '@/infrastructure/repositories/epub-job-repository.adapter.js';

/**
 * 任務狀態同步服務
 * 負責檢查隊列中的任務狀態，並與資料庫同步
 * 此服務由 Worker 排程器調用，不再使用 @Cron 裝飾器
 */
@Injectable()
export class JobStatusSyncService {
  private readonly logger = new Logger(JobStatusSyncService.name);

  constructor(
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueAdapter: QueuePort,
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: EpubJobRepositoryTypeORM,
  ) {}

  /**
   * 執行任務狀態同步
   * 此方法由 Worker 排程器調用
   */
  async execute(): Promise<void> {
    this.logger.log('開始同步任務狀態');

    try {
      // 同步 EPUB 任務狀態
      await this.syncEpubJobs();

      this.logger.log('任務狀態同步完成');
    } catch (error) {
      this.logger.error(`任務狀態同步失敗: ${error.message}`, error.stack);
    }
  }

  /**
   * 同步 EPUB 任務狀態
   */
  private async syncEpubJobs(): Promise<void> {
    // 獲取處於 QUEUED 或 PROCESSING 狀態的 EPUB 任務
    const pendingJobs = await this.epubJobRepository.findByStatus([
      JobStatus.QUEUED,
      JobStatus.PROCESSING,
    ]);

    this.logger.log(`發現 ${pendingJobs.length} 個待處理的 EPUB 任務`);

    for (const job of pendingJobs) {
      try {
        // 檢查隊列中的任務狀態
        const queueStatus = await this.queueAdapter.getCachedJobStatus(
          'epub',
          job.id,
        );

        // 如果隊列中的狀態與資料庫不同，則更新資料庫
        if (queueStatus && queueStatus.status !== job.status) {
          // 建立更新後的任務實體
          const updatedJob = EpubJob.reconstitute({
            id: job.id,
            novelId: job.novelId,
            status: queueStatus.status as JobStatus,
            createdAt: job.createdAt,
            publicUrl: queueStatus.publicUrl || job.publicUrl,
            errorMessage: queueStatus.errorMessage || job.errorMessage,
            startedAt: job.startedAt,
            completedAt:
              queueStatus.status === JobStatus.COMPLETED ||
              queueStatus.status === JobStatus.FAILED
                ? new Date()
                : job.completedAt,
          });

          await this.epubJobRepository.save(updatedJob);
          this.logger.log(
            `已更新 EPUB 任務 ${job.id} 狀態為 ${queueStatus.status}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `同步 EPUB 任務 ${job.id} 狀態失敗: ${error.message}`,
        );
      }
    }
  }

  /**
   * 獲取需要同步的活躍任務 ID 列表
   * 這個方法需要根據系統實際情況來實現
   */
  private async getActiveJobIds(): Promise<string[]> {
    try {
      // 從數據庫查詢最近 24 小時內的未完成任務
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // 注意：這裡假設 epubJobRepository 有一個 findRecentActiveJobs 方法
      // 您需要在 Repository 中實現這個方法
      const activeJobs = await (
        this.epubJobRepository as any
      ).findRecentActiveJobs(twentyFourHoursAgo);

      return activeJobs.map((job) => job.id);
    } catch (error) {
      this.logger.error(
        `獲取活躍任務時發生錯誤: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
}

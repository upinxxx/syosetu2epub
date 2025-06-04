import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  EpubJobRepository,
  EPUB_JOB_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { QueuePort, QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';

export interface ConsistencyReport {
  timestamp: Date;
  totalJobs: number;
  inconsistentJobs: number;
  orphanedCacheEntries: number;
  missingCacheEntries: number;
  statusMismatches: number;
  userIdMismatches: number;
  details: ConsistencyIssue[];
}

export interface ConsistencyIssue {
  type:
    | 'STATUS_MISMATCH'
    | 'USER_ID_MISMATCH'
    | 'ORPHANED_CACHE'
    | 'MISSING_CACHE';
  jobId: string;
  description: string;
  dbValue?: any;
  cacheValue?: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * 數據一致性驗證服務
 * 檢查數據庫、緩存和佇列之間的數據一致性
 */
@Injectable()
export class DataConsistencyValidator {
  private readonly logger = new Logger(DataConsistencyValidator.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: EpubJobRepository,
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueService: QueuePort,
  ) {}

  /**
   * 執行完整的數據一致性檢查
   */
  async validateConsistency(): Promise<ConsistencyReport> {
    this.logger.log('開始執行數據一致性檢查');
    const startTime = Date.now();

    const report: ConsistencyReport = {
      timestamp: new Date(),
      totalJobs: 0,
      inconsistentJobs: 0,
      orphanedCacheEntries: 0,
      missingCacheEntries: 0,
      statusMismatches: 0,
      userIdMismatches: 0,
      details: [],
    };

    try {
      // 1. 檢查數據庫和緩存的一致性
      await this.checkDatabaseCacheConsistency(report);

      // 2. 檢查活躍任務的佇列狀態
      await this.checkActiveJobsQueueConsistency(report);

      // 3. 檢查用戶ID一致性
      await this.checkUserIdConsistency(report);

      // 4. 檢查孤立的緩存項目
      await this.checkOrphanedCacheEntries(report);

      const duration = Date.now() - startTime;
      this.logger.log(
        `數據一致性檢查完成，耗時: ${duration}ms, ` +
          `總任務: ${report.totalJobs}, 不一致任務: ${report.inconsistentJobs}`,
      );

      return report;
    } catch (error) {
      this.logger.error(`數據一致性檢查失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 檢查數據庫和緩存的一致性
   */
  private async checkDatabaseCacheConsistency(
    report: ConsistencyReport,
  ): Promise<void> {
    this.logger.debug('檢查數據庫和緩存一致性');

    try {
      // 獲取最近活躍的任務（7天內）
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeJobs =
        await this.epubJobRepository.findRecentActiveJobs(since);
      report.totalJobs = activeJobs.length;

      for (const job of activeJobs) {
        const cachedStatus = await this.queueService.getCachedJobStatus(
          'epub',
          job.id,
        );

        if (!cachedStatus) {
          // 緩存項目遺失
          report.missingCacheEntries++;
          report.inconsistentJobs++;
          report.details.push({
            type: 'MISSING_CACHE',
            jobId: job.id,
            description: `數據庫中存在任務但緩存中找不到對應項目`,
            dbValue: job.status,
            severity: 'MEDIUM',
          });
          continue;
        }

        // 檢查狀態一致性
        if (job.status !== cachedStatus.status) {
          report.statusMismatches++;
          report.inconsistentJobs++;
          report.details.push({
            type: 'STATUS_MISMATCH',
            jobId: job.id,
            description: `狀態不一致：數據庫為 ${job.status}，緩存為 ${cachedStatus.status}`,
            dbValue: job.status,
            cacheValue: cachedStatus.status,
            severity: this.getStatusMismatchSeverity(
              job.status,
              cachedStatus.status,
            ),
          });
        }

        // 檢查用戶ID一致性
        if (job.userId !== cachedStatus.userId) {
          report.userIdMismatches++;
          report.inconsistentJobs++;
          report.details.push({
            type: 'USER_ID_MISMATCH',
            jobId: job.id,
            description: `用戶ID不一致：數據庫為 ${job.userId}，緩存為 ${cachedStatus.userId}`,
            dbValue: job.userId,
            cacheValue: cachedStatus.userId,
            severity: 'HIGH',
          });
        }
      }
    } catch (error) {
      this.logger.error(`檢查數據庫緩存一致性失敗: ${error.message}`);
    }
  }

  /**
   * 檢查活躍任務的佇列狀態
   */
  private async checkActiveJobsQueueConsistency(
    report: ConsistencyReport,
  ): Promise<void> {
    this.logger.debug('檢查活躍任務的佇列狀態');

    try {
      // 獲取處理中的任務
      const processingJobs = await this.epubJobRepository.findByStatus([
        JobStatus.QUEUED,
        JobStatus.PROCESSING,
      ]);

      for (const job of processingJobs) {
        // 檢查佇列中是否存在對應的任務
        const queueStatus = await this.queueService.getJobStatus(
          'epub',
          job.id,
        );

        if (!queueStatus && job.status === JobStatus.QUEUED) {
          report.inconsistentJobs++;
          report.details.push({
            type: 'MISSING_CACHE',
            jobId: job.id,
            description: `數據庫顯示任務狀態為 QUEUED，但佇列中找不到對應任務`,
            dbValue: job.status,
            severity: 'HIGH',
          });
        }
      }
    } catch (error) {
      this.logger.error(`檢查佇列一致性失敗: ${error.message}`);
    }
  }

  /**
   * 檢查用戶ID一致性
   */
  private async checkUserIdConsistency(
    report: ConsistencyReport,
  ): Promise<void> {
    this.logger.debug('檢查用戶ID一致性');

    try {
      // 獲取最近的任務
      const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3天內
      const recentJobs =
        await this.epubJobRepository.findRecentActiveJobs(since);

      for (const job of recentJobs) {
        const cachedStatus = await this.queueService.getCachedJobStatus(
          'epub',
          job.id,
        );

        if (cachedStatus && job.userId !== cachedStatus.userId) {
          // 這個檢查在 checkDatabaseCacheConsistency 中已經處理了
          // 但我們可以在這裡添加額外的邏輯來檢查用戶ID的有效性
          if (job.userId && cachedStatus.userId === null) {
            report.details.push({
              type: 'USER_ID_MISMATCH',
              jobId: job.id,
              description: `緩存中用戶ID遺失，數據庫中有用戶ID: ${job.userId}`,
              dbValue: job.userId,
              cacheValue: cachedStatus.userId,
              severity: 'CRITICAL',
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`檢查用戶ID一致性失敗: ${error.message}`);
    }
  }

  /**
   * 檢查孤立的緩存項目
   */
  private async checkOrphanedCacheEntries(
    report: ConsistencyReport,
  ): Promise<void> {
    this.logger.debug('檢查孤立的緩存項目');

    // 注意：這個功能需要 Redis 的 SCAN 命令支持
    // 由於實現複雜度，這裡提供基本框架
    try {
      // 實際實現需要掃描 Redis 中的所有 job:epub:* 鍵
      // 然後檢查對應的數據庫記錄是否存在
      // 這裡暫時跳過實現，留待後續優化
      this.logger.debug('孤立緩存項目檢查暫時跳過');
    } catch (error) {
      this.logger.error(`檢查孤立緩存項目失敗: ${error.message}`);
    }
  }

  /**
   * 獲取狀態不匹配的嚴重程度
   */
  private getStatusMismatchSeverity(
    dbStatus: JobStatus,
    cacheStatus: JobStatus,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // 如果數據庫狀態更新（完成/失敗），但緩存還是舊狀態，這是高優先級問題
    if (
      (dbStatus === JobStatus.COMPLETED || dbStatus === JobStatus.FAILED) &&
      (cacheStatus === JobStatus.QUEUED || cacheStatus === JobStatus.PROCESSING)
    ) {
      return 'HIGH';
    }

    // 如果緩存顯示完成但數據庫顯示處理中，這是關鍵問題
    if (
      cacheStatus === JobStatus.COMPLETED &&
      dbStatus === JobStatus.PROCESSING
    ) {
      return 'CRITICAL';
    }

    // 其他情況視為中等優先級
    return 'MEDIUM';
  }

  /**
   * 自動修復發現的一致性問題
   */
  async autoRepairInconsistencies(report: ConsistencyReport): Promise<void> {
    this.logger.log('開始自動修復一致性問題');

    let repairedCount = 0;

    for (const issue of report.details) {
      try {
        switch (issue.type) {
          case 'STATUS_MISMATCH':
            await this.repairStatusMismatch(issue);
            repairedCount++;
            break;

          case 'USER_ID_MISMATCH':
            await this.repairUserIdMismatch(issue);
            repairedCount++;
            break;

          case 'MISSING_CACHE':
            await this.repairMissingCache(issue);
            repairedCount++;
            break;

          default:
            this.logger.warn(`未知的問題類型: ${issue.type}`);
        }
      } catch (error) {
        this.logger.error(
          `修復問題失敗 - 任務ID: ${issue.jobId}, 類型: ${issue.type}, 錯誤: ${error.message}`,
        );
      }
    }

    this.logger.log(`自動修復完成，修復了 ${repairedCount} 個問題`);
  }

  /**
   * 修復狀態不匹配問題
   */
  private async repairStatusMismatch(issue: ConsistencyIssue): Promise<void> {
    const job = await this.epubJobRepository.findById(issue.jobId);
    if (!job) {
      this.logger.warn(`修復狀態不匹配時找不到任務: ${issue.jobId}`);
      return;
    }

    // 以數據庫狀態為準，更新緩存
    await this.queueService.cacheJobStatus('epub', job.id, {
      jobId: job.id,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
      updatedAt: new Date(),
      userId: job.userId,
    });

    this.logger.log(`已修復任務 ${issue.jobId} 的狀態不匹配問題`);
  }

  /**
   * 修復用戶ID不匹配問題
   */
  private async repairUserIdMismatch(issue: ConsistencyIssue): Promise<void> {
    const job = await this.epubJobRepository.findById(issue.jobId);
    if (!job) {
      this.logger.warn(`修復用戶ID不匹配時找不到任務: ${issue.jobId}`);
      return;
    }

    // 以數據庫的用戶ID為準，更新緩存
    await this.queueService.cacheJobStatus('epub', job.id, {
      jobId: job.id,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
      updatedAt: new Date(),
      userId: job.userId, // 使用數據庫中的用戶ID
    });

    this.logger.log(`已修復任務 ${issue.jobId} 的用戶ID不匹配問題`);
  }

  /**
   * 修復缺失的緩存項目
   */
  private async repairMissingCache(issue: ConsistencyIssue): Promise<void> {
    const job = await this.epubJobRepository.findById(issue.jobId);
    if (!job) {
      this.logger.warn(`修復缺失緩存時找不到任務: ${issue.jobId}`);
      return;
    }

    // 從數據庫恢復緩存項目
    await this.queueService.cacheJobStatus('epub', job.id, {
      jobId: job.id,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
      updatedAt: new Date(),
      userId: job.userId,
    });

    this.logger.log(`已恢復任務 ${issue.jobId} 的緩存項目`);
  }
}

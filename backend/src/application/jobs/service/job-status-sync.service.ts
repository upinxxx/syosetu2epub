import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueuePort, QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { EPUB_JOB_REPOSITORY_TOKEN } from '@/domain/ports/repository/index.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';
import { EpubJobRepositoryTypeORM } from '@/infrastructure/repositories/epub-job.repository.js';

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

      // 🔑 增強：執行全面的數據一致性檢查
      await this.performDataConsistencyCheck();

      // 執行自動修復機制
      await this.autoRepairUserIdLoss();

      // 🔑 增強：清理過期的緩存數據
      await this.cleanupExpiredCacheData();

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

        // 檢測 userId 遺失問題
        await this.detectUserIdLoss(job, queueStatus);

        // 如果隊列中的狀態與資料庫不同，則更新資料庫
        if (queueStatus && queueStatus.status !== job.status) {
          // 處理 completed 狀態但缺少 publicUrl 的情況
          let finalPublicUrl = queueStatus.publicUrl || job.publicUrl;

          if (queueStatus.status === JobStatus.COMPLETED && !finalPublicUrl) {
            this.logger.warn(
              `任務 ${job.id} 標記為完成但缺少 publicUrl，跳過同步`,
            );
            continue;
          }

          // 建立更新後的任務實體
          const updatedJob = EpubJob.reconstitute({
            id: job.id,
            novelId: job.novelId,
            status: queueStatus.status as JobStatus,
            createdAt: job.createdAt,
            publicUrl: finalPublicUrl,
            errorMessage: queueStatus.errorMessage || job.errorMessage,
            startedAt: job.startedAt,
            completedAt:
              queueStatus.status === JobStatus.COMPLETED ||
              queueStatus.status === JobStatus.FAILED
                ? queueStatus.completedAt || new Date()
                : job.completedAt,
            userId:
              queueStatus.userId !== undefined
                ? queueStatus.userId
                : job.userId,
          });

          await this.epubJobRepository.save(updatedJob);
          this.logger.log(
            `已更新 EPUB 任務 ${job.id} 狀態為 ${queueStatus.status}，userId: ${updatedJob.userId}` +
              (finalPublicUrl ? `, publicUrl: ${finalPublicUrl}` : ''),
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
   * 檢測 userId 遺失問題
   */
  private async detectUserIdLoss(
    job: EpubJob,
    queueStatus: any,
  ): Promise<void> {
    const dbUserId = job.userId;
    const queueUserId = queueStatus?.userId;

    // 檢查是否存在 userId 遺失
    if (
      dbUserId !== null &&
      (queueUserId === null || queueUserId === undefined)
    ) {
      this.logger.warn(
        `檢測到 userId 遺失 - 任務 ${job.id}: 資料庫有用戶 ${dbUserId}，但佇列中為 ${queueUserId}`,
      );

      // 記錄詳細信息用於調試
      this.logger.warn(
        `任務 ${job.id} userId 遺失詳情 - ` +
          `資料庫userId類型: ${typeof dbUserId}, 值: ${JSON.stringify(dbUserId)}, ` +
          `佇列userId類型: ${typeof queueUserId}, 值: ${JSON.stringify(queueUserId)}, ` +
          `佇列狀態: ${queueStatus?.status}`,
      );
    } else if (dbUserId !== queueUserId) {
      this.logger.debug(
        `任務 ${job.id} userId 不一致 - 資料庫: ${dbUserId}, 佇列: ${queueUserId}`,
      );
    } else {
      this.logger.debug(`任務 ${job.id} userId 一致性檢查通過: ${dbUserId}`);
    }
  }

  /**
   * 🔑 增強：執行全面的數據一致性檢查
   * 檢查佇列、緩存、資料庫之間的數據一致性
   */
  private async performDataConsistencyCheck(): Promise<void> {
    this.logger.log('開始執行數據一致性檢查');

    try {
      // 獲取最近 24 小時內的所有任務
      const recentJobs = await this.getRecentJobs();
      let inconsistencyCount = 0;
      let repairedCount = 0;

      for (const job of recentJobs) {
        try {
          const inconsistencies = await this.checkJobConsistency(job);

          if (inconsistencies.length > 0) {
            inconsistencyCount++;
            this.logger.warn(
              `任務 ${job.id} 發現 ${inconsistencies.length} 個一致性問題: ${inconsistencies.join(', ')}`,
            );

            // 嘗試自動修復
            const repaired = await this.repairJobInconsistencies(
              job,
              inconsistencies,
            );
            if (repaired) {
              repairedCount++;
            }
          }
        } catch (error) {
          this.logger.error(
            `檢查任務 ${job.id} 一致性時發生錯誤: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `數據一致性檢查完成 - 檢查了 ${recentJobs.length} 個任務，` +
          `發現 ${inconsistencyCount} 個不一致，修復了 ${repairedCount} 個`,
      );
    } catch (error) {
      this.logger.error(
        `執行數據一致性檢查時發生錯誤: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 🔑 增強：檢查單個任務的一致性
   */
  private async checkJobConsistency(job: EpubJob): Promise<string[]> {
    const inconsistencies: string[] = [];

    try {
      // 檢查緩存狀態
      const cachedStatus = await this.queueAdapter.getCachedJobStatus(
        'epub',
        job.id,
      );

      // 檢查佇列狀態
      const queueStatus = await this.queueAdapter.getJobStatus('epub', job.id);

      // 1. 檢查狀態一致性
      if (cachedStatus && cachedStatus.status !== job.status) {
        inconsistencies.push(
          `狀態不一致(DB:${job.status} vs Cache:${cachedStatus.status})`,
        );
      }

      if (queueStatus && queueStatus !== job.status) {
        inconsistencies.push(
          `狀態不一致(DB:${job.status} vs Queue:${queueStatus})`,
        );
      }

      // 2. 檢查 userId 一致性
      if (cachedStatus && cachedStatus.userId !== job.userId) {
        inconsistencies.push(
          `userId不一致(DB:${job.userId} vs Cache:${cachedStatus.userId})`,
        );
      }

      // 3. 檢查時間戳一致性
      if (cachedStatus) {
        if (
          job.startedAt &&
          cachedStatus.startedAt &&
          Math.abs(job.startedAt.getTime() - cachedStatus.startedAt.getTime()) >
            60000
        ) {
          inconsistencies.push('startedAt時間戳不一致');
        }

        if (
          job.completedAt &&
          cachedStatus.completedAt &&
          Math.abs(
            job.completedAt.getTime() - cachedStatus.completedAt.getTime(),
          ) > 60000
        ) {
          inconsistencies.push('completedAt時間戳不一致');
        }
      }

      // 4. 檢查 URL 一致性
      if (cachedStatus && cachedStatus.publicUrl !== job.publicUrl) {
        inconsistencies.push(
          `publicUrl不一致(DB:${job.publicUrl} vs Cache:${cachedStatus.publicUrl})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `檢查任務 ${job.id} 一致性時發生錯誤: ${error.message}`,
      );
      inconsistencies.push(`檢查失敗: ${error.message}`);
    }

    return inconsistencies;
  }

  /**
   * 🔑 增強：修復任務不一致問題
   */
  private async repairJobInconsistencies(
    job: EpubJob,
    inconsistencies: string[],
  ): Promise<boolean> {
    try {
      this.logger.log(`開始修復任務 ${job.id} 的不一致問題`);

      // 獲取最新的緩存狀態作為修復依據
      const cachedStatus = await this.queueAdapter.getCachedJobStatus(
        'epub',
        job.id,
      );

      if (!cachedStatus) {
        this.logger.warn(`無法修復任務 ${job.id}，緩存中沒有找到狀態信息`);
        return false;
      }

      // 檢查如果狀態是 completed 但沒有 publicUrl，則無法修復
      if (
        cachedStatus.status === JobStatus.COMPLETED &&
        !cachedStatus.publicUrl
      ) {
        this.logger.error(
          `無法修復任務 ${job.id}，completed 狀態但缺少 publicUrl`,
        );
        return false;
      }

      // 構建修復後的任務實體
      const repairedJob = EpubJob.reconstitute({
        id: job.id,
        novelId: job.novelId,
        status: cachedStatus.status as JobStatus,
        createdAt: job.createdAt,
        startedAt: cachedStatus.startedAt || job.startedAt,
        completedAt: cachedStatus.completedAt || job.completedAt,
        publicUrl: cachedStatus.publicUrl || job.publicUrl,
        errorMessage: cachedStatus.errorMessage || job.errorMessage,
        userId:
          cachedStatus.userId !== undefined ? cachedStatus.userId : job.userId,
      });

      // 保存修復後的任務
      await this.epubJobRepository.save(repairedJob);

      this.logger.log(
        `已修復任務 ${job.id} - 狀態: ${repairedJob.status}, userId: ${repairedJob.userId}` +
          (repairedJob.publicUrl
            ? `, publicUrl: ${repairedJob.publicUrl}`
            : ''),
      );

      return true;
    } catch (error) {
      this.logger.error(`修復任務 ${job.id} 時發生錯誤: ${error.message}`);
      return false;
    }
  }

  /**
   * 🔑 增強：獲取最近的任務
   */
  private async getRecentJobs(): Promise<EpubJob[]> {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // 獲取最近 24 小時內的所有任務
      const recentJobs =
        await this.epubJobRepository.findRecentActiveJobs(twentyFourHoursAgo);

      this.logger.debug(`找到 ${recentJobs.length} 個最近的任務`);
      return recentJobs;
    } catch (error) {
      this.logger.error(`獲取最近任務時發生錯誤: ${error.message}`);
      return [];
    }
  }

  /**
   * 🔑 增強：清理過期的緩存數據
   */
  private async cleanupExpiredCacheData(): Promise<void> {
    this.logger.log('開始清理過期的緩存數據');

    try {
      // 獲取 7 天前完成的任務
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const oldCompletedJobs = await this.epubJobRepository.findByStatus([
        JobStatus.COMPLETED,
        JobStatus.FAILED,
      ]);

      let cleanedCount = 0;

      for (const job of oldCompletedJobs) {
        if (job.completedAt && job.completedAt < sevenDaysAgo) {
          try {
            await this.queueAdapter.removeCachedJobStatus('epub', job.id);
            cleanedCount++;
          } catch (error) {
            this.logger.warn(
              `清理任務 ${job.id} 緩存時發生錯誤: ${error.message}`,
            );
          }
        }
      }

      this.logger.log(`緩存清理完成，清理了 ${cleanedCount} 個過期緩存`);
    } catch (error) {
      this.logger.error(
        `清理過期緩存時發生錯誤: ${error.message}`,
        error.stack,
      );
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

  /**
   * 自動修復 userId 遺失問題
   * 處理歷史的 userId 為 NULL 的任務
   */
  private async autoRepairUserIdLoss(): Promise<void> {
    try {
      this.logger.log('開始執行 userId 遺失自動修復');

      // 查找最近 7 天內完成但 userId 為 NULL 的任務
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 注意：這裡需要在 Repository 中實現 findCompletedJobsWithNullUserId 方法
      const nullUserIdJobs = await (
        this.epubJobRepository as any
      ).findCompletedJobsWithNullUserId?.(sevenDaysAgo);

      if (!nullUserIdJobs || nullUserIdJobs.length === 0) {
        this.logger.debug('沒有發現需要修復的 userId 為 NULL 的任務');
        return;
      }

      this.logger.log(`發現 ${nullUserIdJobs.length} 個需要修復的任務`);

      for (const job of nullUserIdJobs) {
        try {
          // 嘗試從 Redis 緩存中恢復 userId
          const cachedStatus = await this.queueAdapter.getCachedJobStatus(
            'epub',
            job.id,
          );

          if (cachedStatus?.userId) {
            // 從緩存中恢復 userId
            const repairedJob = EpubJob.reconstitute({
              id: job.id,
              novelId: job.novelId,
              status: job.status,
              createdAt: job.createdAt,
              publicUrl: job.publicUrl,
              errorMessage: job.errorMessage,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
              userId: cachedStatus.userId,
            });

            await this.epubJobRepository.save(repairedJob);
            this.logger.log(
              `已修復任務 ${job.id} 的 userId: ${cachedStatus.userId}`,
            );
          } else {
            this.logger.warn(
              `無法修復任務 ${job.id} 的 userId，緩存中也沒有找到用戶信息`,
            );
          }
        } catch (error) {
          this.logger.error(
            `修復任務 ${job.id} 的 userId 時發生錯誤: ${error.message}`,
          );
        }
      }

      this.logger.log('userId 遺失自動修復完成');
    } catch (error) {
      this.logger.error(
        `執行 userId 遺失自動修復時發生錯誤: ${error.message}`,
        error.stack,
      );
    }
  }
}

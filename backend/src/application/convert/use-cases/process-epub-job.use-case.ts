import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@/domain/enums/job-status.enum.js';
import { buildNovelUrl } from '@/infrastructure/utils/url-builder.js';
import {
  EPUB_JOB_REPOSITORY_TOKEN,
  NOVEL_REPOSITORY_TOKEN,
  Repository,
} from '@/domain/ports/repository/index.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { Novel } from '@/domain/entities/novel.entity.js';
import { GenerateEpubUseCase } from './generate-epub.use-case.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { QueuePort, QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';
import { LockPort, LOCK_PORT_TOKEN } from '@/domain/ports/lock.port.js';

export interface ProcessJobData {
  jobId: string;
  novelId: string;
  userId?: string | null;
}

/**
 * 處理 EPUB 轉換任務 UseCase
 * 執行整個 EPUB 檔案生成流程
 */
@Injectable()
export class ProcessEpubJobUseCase {
  private readonly logger = new Logger(ProcessEpubJobUseCase.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: Repository<EpubJob>,
    @Inject(NOVEL_REPOSITORY_TOKEN)
    private readonly novelRepository: Repository<Novel>,
    @Inject(GenerateEpubUseCase)
    private readonly generateEpubUseCase: GenerateEpubUseCase,
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueAdapter: QueuePort,
    @Inject(LOCK_PORT_TOKEN)
    private readonly lockService: LockPort,
  ) {}

  /**
   * 處理單個 EPUB 轉換任務
   */
  async execute(jobData: ProcessJobData): Promise<void> {
    const { jobId, novelId, userId } = jobData;
    const lockKey = `epub-job:${jobId}`;

    this.logger.log(
      `開始處理 EPUB 轉換任務: ${jobId}, 用戶ID: ${userId || 'anonymous'}`,
    );

    // 🔒 獲取分佈式鎖，防止同一任務的並發處理
    const releaseLock = await this.lockService.acquireLock(
      lockKey,
      30000, // 30 秒 TTL
      5000, // 5 秒等待時間
    );

    if (!releaseLock) {
      const message = `無法獲取任務 ${jobId} 的處理鎖，可能正在被其他 Worker 處理`;
      this.logger.warn(message);
      throw new Error(message);
    }

    try {
      // 1. 確認任務和小說是否存在
      const job = await this.epubJobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundException(`找不到 ID 為 ${jobId} 的任務`);
      }

      // 檢查任務是否已經在處理中或已完成
      if (job.status === JobStatus.PROCESSING) {
        this.logger.warn(`任務 ${jobId} 已在處理中，跳過重複處理`);
        return;
      }

      if (job.status === JobStatus.COMPLETED) {
        this.logger.warn(`任務 ${jobId} 已完成，跳過重複處理`);
        return;
      }

      const novel = await this.novelRepository.findById(novelId);
      if (!novel) {
        throw new NotFoundException(`找不到 ID 為 ${novelId} 的小說`);
      }

      // 1.1 驗證 userId 一致性
      await this.validateUserIdConsistency(job, userId);

      // 2. 更新任務狀態為處理中（保持 userId）
      await this.updateJobStatus(job, JobStatus.PROCESSING, userId);

      // 3. 根據來源構建小說 URL
      const novelUrl = buildNovelUrl(
        novel.source as NovelSource,
        novel.sourceId,
      );

      // 4. 生成 EPUB 並上傳，獲取公共 URL
      const publicUrl = await this.generateEpubUseCase.execute(
        novelUrl,
        novel.source as NovelSource,
      );

      // 5. 更新任務狀態為完成，並保存下載連結（保持 userId）
      await this.updateJobStatusWithUrl(
        job,
        JobStatus.COMPLETED,
        publicUrl,
        userId,
      );

      // 5.1 最終驗證 userId 一致性
      await this.validateFinalUserIdConsistency(jobId, userId);

      this.logger.log(`任務 ${jobId} 處理成功，下載連結: ${publicUrl}`);
    } catch (error) {
      this.logger.error(
        `處理任務 ${jobId} 失敗: ${error.message}`,
        error.stack,
      );

      // 獲取任務引用（如果存在）
      try {
        const job = await this.epubJobRepository.findById(jobId);
        if (job) {
          // 更新任務狀態為失敗（保持 userId）
          await this.updateJobStatusWithError(
            job,
            JobStatus.FAILED,
            error.message,
            userId,
          );
        }
      } catch (updateError) {
        this.logger.error(`無法更新任務失敗狀態: ${updateError.message}`);
      }

      // 重新拋出錯誤，讓呼叫者可以決定是否重試
      throw error;
    } finally {
      // 🔓 確保釋放鎖
      try {
        await releaseLock();
        this.logger.debug(`已釋放任務 ${jobId} 的處理鎖`);
      } catch (lockError) {
        this.logger.error(
          `釋放任務 ${jobId} 的處理鎖失敗: ${lockError.message}`,
        );
      }
    }
  }

  /**
   * 更新任務狀態
   */
  private async updateJobStatus(
    job: EpubJob,
    status: JobStatus,
    userId?: string | null,
  ): Promise<void> {
    const startedAt =
      job.startedAt ||
      (status === JobStatus.PROCESSING ? new Date() : undefined);

    const finalUserId = userId !== undefined ? userId : job.userId;

    // 詳細日誌記錄
    this.logger.log(
      `更新任務 ${job.id} 狀態為 ${status} - ` +
        `原始userId: ${job.userId}, 傳入userId: ${userId}, 最終userId: ${finalUserId}`,
    );

    const updatedJob = EpubJob.reconstitute({
      id: job.id,
      novelId: job.novelId,
      status,
      createdAt: job.createdAt,
      startedAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
      userId: finalUserId,
    });

    // 更新數據庫
    await this.epubJobRepository.save(updatedJob);
    this.logger.debug(`任務 ${job.id} 已保存到資料庫，userId: ${finalUserId}`);

    // 更新 Redis 緩存
    await this.queueAdapter.cacheJobStatus('epub', job.id, {
      jobId: job.id,
      status,
      startedAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
      updatedAt: new Date(),
      userId: finalUserId,
    });
    this.logger.debug(
      `任務 ${job.id} 已更新 Redis 緩存，userId: ${finalUserId}`,
    );
  }

  /**
   * 更新任務狀態並設置下載連結
   */
  private async updateJobStatusWithUrl(
    job: EpubJob,
    status: JobStatus,
    publicUrl: string,
    userId?: string | null,
  ): Promise<void> {
    const startedAt = job.startedAt || new Date();
    const completedAt =
      status === JobStatus.COMPLETED ? new Date() : job.completedAt;

    const finalUserId = userId !== undefined ? userId : job.userId;

    // 詳細日誌記錄
    this.logger.log(
      `更新任務 ${job.id} 狀態為 ${status}，設置下載連結 - ` +
        `原始userId: ${job.userId}, 傳入userId: ${userId}, 最終userId: ${finalUserId}, ` +
        `publicUrl: ${publicUrl}`,
    );

    const updatedJob = EpubJob.reconstitute({
      id: job.id,
      novelId: job.novelId,
      status,
      createdAt: job.createdAt,
      startedAt,
      completedAt,
      publicUrl: publicUrl,
      errorMessage: job.errorMessage,
      userId: finalUserId,
    });

    // 更新數據庫
    await this.epubJobRepository.save(updatedJob);
    this.logger.debug(
      `任務 ${job.id} 已保存到資料庫，userId: ${finalUserId}, publicUrl: ${publicUrl}`,
    );

    // 更新 Redis 緩存
    await this.queueAdapter.cacheJobStatus('epub', job.id, {
      jobId: job.id,
      status,
      startedAt,
      completedAt,
      publicUrl,
      errorMessage: job.errorMessage,
      updatedAt: new Date(),
      userId: finalUserId,
    });
    this.logger.debug(
      `任務 ${job.id} 已更新 Redis 緩存，userId: ${finalUserId}, publicUrl: ${publicUrl}`,
    );
  }

  /**
   * 更新任務狀態為失敗並記錄錯誤信息
   */
  private async updateJobStatusWithError(
    job: EpubJob,
    status: JobStatus,
    errorMessage: string,
    userId?: string | null,
  ): Promise<void> {
    const startedAt = job.startedAt || new Date();
    const completedAt = new Date(); // 完成時間就是失敗時間

    const finalUserId = userId !== undefined ? userId : job.userId;

    // 詳細日誌記錄
    this.logger.log(
      `更新任務 ${job.id} 狀態為 ${status}，記錄錯誤 - ` +
        `原始userId: ${job.userId}, 傳入userId: ${userId}, 最終userId: ${finalUserId}, ` +
        `errorMessage: ${errorMessage}`,
    );

    const updatedJob = EpubJob.reconstitute({
      id: job.id,
      novelId: job.novelId,
      status,
      createdAt: job.createdAt,
      startedAt,
      completedAt,
      publicUrl: job.publicUrl,
      errorMessage: errorMessage,
      userId: finalUserId,
    });

    // 更新數據庫
    await this.epubJobRepository.save(updatedJob);
    this.logger.debug(
      `任務 ${job.id} 已保存到資料庫，userId: ${finalUserId}, errorMessage: ${errorMessage}`,
    );

    // 更新 Redis 緩存
    await this.queueAdapter.cacheJobStatus('epub', job.id, {
      jobId: job.id,
      status,
      startedAt,
      completedAt,
      publicUrl: job.publicUrl,
      errorMessage,
      updatedAt: new Date(),
      userId: finalUserId,
    });
    this.logger.debug(
      `任務 ${job.id} 已更新 Redis 緩存，userId: ${finalUserId}, errorMessage: ${errorMessage}`,
    );
  }

  /**
   * 驗證 userId 一致性
   */
  private async validateUserIdConsistency(
    job: EpubJob,
    queueUserId: string | null | undefined,
  ): Promise<void> {
    const dbUserId = job.userId;
    const normalizedQueueUserId =
      queueUserId === undefined ? null : queueUserId;

    if (dbUserId !== normalizedQueueUserId) {
      this.logger.warn(
        `任務 ${job.id} 的 userId 不一致 - 資料庫: ${dbUserId}, 佇列: ${normalizedQueueUserId}`,
      );

      // 記錄詳細的不一致信息
      this.logger.warn(
        `任務 ${job.id} userId 不一致詳情 - ` +
          `資料庫類型: ${typeof dbUserId}, 值: ${JSON.stringify(dbUserId)}, ` +
          `佇列類型: ${typeof normalizedQueueUserId}, 值: ${JSON.stringify(normalizedQueueUserId)}`,
      );

      // 如果資料庫中有 userId 但佇列中沒有，這是嚴重問題
      if (dbUserId !== null && normalizedQueueUserId === null) {
        this.logger.error(
          `嚴重錯誤：任務 ${job.id} 在資料庫中有用戶 ${dbUserId}，但佇列中為匿名用戶`,
        );
      }
    } else {
      this.logger.debug(`任務 ${job.id} 的 userId 一致性檢查通過: ${dbUserId}`);
    }
  }

  /**
   * 最終驗證 userId 一致性
   */
  private async validateFinalUserIdConsistency(
    jobId: string,
    userId: string | null | undefined,
  ): Promise<void> {
    const job = await this.epubJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`找不到 ID 為 ${jobId} 的任務`);
    }

    const dbUserId = job.userId;
    const normalizedUserId = userId === undefined ? null : userId;

    if (dbUserId !== normalizedUserId) {
      this.logger.warn(
        `任務 ${jobId} 的 userId 不一致 - 資料庫: ${dbUserId}, 佇列: ${normalizedUserId}`,
      );

      // 記錄詳細的不一致信息
      this.logger.warn(
        `任務 ${jobId} userId 不一致詳情 - ` +
          `資料庫類型: ${typeof dbUserId}, 值: ${JSON.stringify(dbUserId)}, ` +
          `佇列類型: ${typeof normalizedUserId}, 值: ${JSON.stringify(normalizedUserId)}`,
      );

      // 如果資料庫中有 userId 但佇列中沒有，這是嚴重問題
      if (dbUserId !== null && normalizedUserId === null) {
        this.logger.error(
          `嚴重錯誤：任務 ${jobId} 在資料庫中有用戶 ${dbUserId}，但佇列中為匿名用戶`,
        );
      }
    } else {
      this.logger.debug(`任務 ${jobId} 的 userId 一致性檢查通過: ${dbUserId}`);
    }
  }
}

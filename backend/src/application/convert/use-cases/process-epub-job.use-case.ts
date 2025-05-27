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

export interface ProcessJobData {
  jobId: string;
  novelId: string;
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
  ) {}

  /**
   * 處理單個 EPUB 轉換任務
   */
  async execute(jobData: ProcessJobData): Promise<void> {
    const { jobId, novelId } = jobData;
    this.logger.log(`開始處理 EPUB 轉換任務: ${jobId}`);

    try {
      // 1. 確認任務和小說是否存在
      const job = await this.epubJobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundException(`找不到 ID 為 ${jobId} 的任務`);
      }

      const novel = await this.novelRepository.findById(novelId);
      if (!novel) {
        throw new NotFoundException(`找不到 ID 為 ${novelId} 的小說`);
      }

      // 2. 更新任務狀態為處理中
      await this.updateJobStatus(job, JobStatus.PROCESSING);

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

      // 5. 更新任務狀態為完成，並保存下載連結
      await this.updateJobStatusWithUrl(job, JobStatus.COMPLETED, publicUrl);

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
          // 更新任務狀態為失敗
          await this.updateJobStatusWithError(
            job,
            JobStatus.FAILED,
            error.message,
          );
        }
      } catch (updateError) {
        this.logger.error(`無法更新任務失敗狀態: ${updateError.message}`);
      }

      // 重新拋出錯誤，讓呼叫者可以決定是否重試
      throw error;
    }
  }

  /**
   * 更新任務狀態
   */
  private async updateJobStatus(
    job: EpubJob,
    status: JobStatus,
  ): Promise<void> {
    const startedAt =
      job.startedAt ||
      (status === JobStatus.PROCESSING ? new Date() : undefined);

    const updatedJob = EpubJob.reconstitute({
      id: job.id,
      novelId: job.novelId,
      status,
      createdAt: job.createdAt,
      startedAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
    });

    // 更新數據庫
    await this.epubJobRepository.save(updatedJob);

    // 更新 Redis 緩存
    await this.queueAdapter.cacheJobStatus('epub', job.id, {
      jobId: job.id,
      status,
      startedAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
      updatedAt: new Date(),
    });
  }

  /**
   * 更新任務狀態並設置下載連結
   */
  private async updateJobStatusWithUrl(
    job: EpubJob,
    status: JobStatus,
    publicUrl: string,
  ): Promise<void> {
    const startedAt = job.startedAt || new Date();
    const completedAt =
      status === JobStatus.COMPLETED ? new Date() : job.completedAt;

    const updatedJob = EpubJob.reconstitute({
      id: job.id,
      novelId: job.novelId,
      status,
      createdAt: job.createdAt,
      startedAt,
      completedAt,
      publicUrl: publicUrl,
      errorMessage: job.errorMessage,
    });

    // 更新數據庫
    await this.epubJobRepository.save(updatedJob);

    // 更新 Redis 緩存
    await this.queueAdapter.cacheJobStatus('epub', job.id, {
      jobId: job.id,
      status,
      startedAt,
      completedAt,
      publicUrl,
      errorMessage: job.errorMessage,
      updatedAt: new Date(),
    });
  }

  /**
   * 更新任務狀態為失敗並記錄錯誤信息
   */
  private async updateJobStatusWithError(
    job: EpubJob,
    status: JobStatus,
    errorMessage: string,
  ): Promise<void> {
    const startedAt = job.startedAt || new Date();
    const completedAt = new Date(); // 完成時間就是失敗時間

    const updatedJob = EpubJob.reconstitute({
      id: job.id,
      novelId: job.novelId,
      status,
      createdAt: job.createdAt,
      startedAt,
      completedAt,
      publicUrl: job.publicUrl,
      errorMessage: errorMessage,
    });

    // 更新數據庫
    await this.epubJobRepository.save(updatedJob);

    // 更新 Redis 緩存
    await this.queueAdapter.cacheJobStatus('epub', job.id, {
      jobId: job.id,
      status,
      startedAt,
      completedAt,
      publicUrl: job.publicUrl,
      errorMessage,
      updatedAt: new Date(),
    });
  }
}

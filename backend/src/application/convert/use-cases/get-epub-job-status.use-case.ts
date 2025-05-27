import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from '@/domain/ports/repository.port.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { EPUB_JOB_REPOSITORY_TOKEN } from '@/infrastructure/repositories/repositories.module.js';
import { JobStatusResponseDto } from '../../shared/dto/job-status.dto.js';
import { QueuePort } from '@/domain/ports/queue.port.js';
import { QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';

/**
 * 獲取 EPUB 轉換任務狀態 UseCase
 */
@Injectable()
export class GetEpubJobStatusUseCase {
  private readonly logger = new Logger(GetEpubJobStatusUseCase.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: Repository<EpubJob>,
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueAdapter: QueuePort,
  ) {}

  /**
   * 獲取任務狀態
   */
  async execute(jobId: string): Promise<JobStatusResponseDto> {
    this.logger.log(`獲取任務 ${jobId} 的狀態`);

    // 首先嘗試從 Redis 緩存中獲取任務狀態
    const cachedStatus = await this.queueAdapter.getCachedJobStatus(
      'epub',
      jobId,
    );

    if (cachedStatus) {
      this.logger.log(
        `從緩存獲取到任務 ${jobId} 的狀態: ${cachedStatus.status}`,
      );

      // 如果緩存中有任務狀態，但需要檢查數據庫中的最新狀態
      // 特別是對於長時間運行的任務，緩存可能不是最新的
      if (
        cachedStatus.status === 'queued' ||
        cachedStatus.status === 'processing'
      ) {
        this.logger.log(`任務 ${jobId} 處於活動狀態，檢查數據庫獲取最新狀態`);

        try {
          // 從數據庫查詢最新狀態
          const job = await this.epubJobRepository.findById(jobId);

          if (job && job.status !== cachedStatus.status) {
            this.logger.log(
              `任務 ${jobId} 狀態已更新：${cachedStatus.status} -> ${job.status}`,
            );

            // 更新緩存
            await this.queueAdapter.cacheJobStatus('epub', jobId, {
              jobId: job.id,
              status: job.status,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
              publicUrl: job.publicUrl,
              errorMessage: job.errorMessage,
              updatedAt: new Date(),
            });

            // 返回數據庫中的最新狀態
            return {
              success: true,
              jobId: job.id,
              status: job.status,
              createdAt: job.createdAt,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
              publicUrl: job.publicUrl,
              errorMessage: job.errorMessage,
              message: `任務 ${jobId} 狀態查詢成功 (已更新)`,
            };
          }
        } catch (error) {
          this.logger.warn(`檢查數據庫狀態時發生錯誤: ${error.message}`);
          // 發生錯誤時繼續使用緩存數據
        }
      }

      // 從緩存構建回應
      return {
        success: true,
        jobId: cachedStatus.jobId,
        status: cachedStatus.status as any, // 轉換為 JobStatus 枚舉
        createdAt: new Date(cachedStatus.updatedAt), // 使用更新時間作為創建時間（如果沒有真實的創建時間）
        startedAt: cachedStatus.startedAt,
        completedAt: cachedStatus.completedAt,
        publicUrl: cachedStatus.publicUrl,
        errorMessage: cachedStatus.errorMessage,
        message: `任務 ${jobId} 狀態查詢成功 (from cache)`,
      };
    }

    // 如果緩存中沒有，則從數據庫查詢
    this.logger.log(`緩存中未找到任務 ${jobId} 的狀態，從數據庫查詢`);
    const job = await this.epubJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`找不到 ID 為 ${jobId} 的任務`);
    }

    // 查詢後更新緩存
    await this.queueAdapter.cacheJobStatus('epub', jobId, {
      jobId: job.id,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
      updatedAt: new Date(),
    });

    return {
      success: true,
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
      message: `任務 ${jobId} 狀態查詢成功`,
    };
  }
}

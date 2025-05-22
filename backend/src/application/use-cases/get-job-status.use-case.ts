import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from '@/domain/ports/repository.port.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { EPUB_JOB_REPOSITORY_TOKEN } from '@/infrastructure/repositories/repositories.module.js';
import { JobStatusResponseDto } from '../../shared/dto/job-status.dto.js';

/**
 * 獲取 EPUB 轉換任務狀態 UseCase
 */
@Injectable()
export class GetJobStatusUseCase {
  private readonly logger = new Logger(GetJobStatusUseCase.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: Repository<EpubJob>,
  ) {}

  /**
   * 獲取任務狀態
   */
  async execute(jobId: string): Promise<JobStatusResponseDto> {
    this.logger.log(`獲取任務 ${jobId} 的狀態`);

    // 從數據庫中查找任務
    const job = await this.epubJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`找不到 ID 為 ${jobId} 的任務`);
    }

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

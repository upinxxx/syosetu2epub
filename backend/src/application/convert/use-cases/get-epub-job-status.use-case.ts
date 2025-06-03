import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import {
  EpubJobRepository,
  EPUB_JOB_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { JobStatusResponseDto } from '@/shared/dto/job-status.dto.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';

/**
 * 獲取 EPUB 轉換任務狀態 UseCase
 */
@Injectable()
export class GetEpubJobStatusUseCase {
  private readonly logger = new Logger(GetEpubJobStatusUseCase.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: EpubJobRepository,
  ) {}

  /**
   * 獲取 EPUB 任務狀態
   * @param jobId 任務ID
   * @returns 任務狀態信息
   */
  async execute(jobId: string): Promise<JobStatusResponseDto> {
    this.logger.log(`查詢任務狀態請求 - 任務ID: ${jobId}`);

    // 嚴格的參數驗證
    if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
      const errorMsg = `無效的任務ID: ${jobId}`;
      this.logger.error(errorMsg);
      throw new Error('任務ID不能為空');
    }

    const trimmedJobId = jobId.trim();

    // 檢查任務ID格式（UUID格式）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedJobId)) {
      const errorMsg = `任務ID格式不正確: ${trimmedJobId}`;
      this.logger.error(errorMsg);
      throw new Error('任務ID格式不正確');
    }

    try {
      this.logger.debug(`開始查詢任務 ${trimmedJobId} 的狀態`);

      const job = await this.epubJobRepository.findById(trimmedJobId);

      if (!job) {
        this.logger.warn(`找不到任務: ${trimmedJobId}`);
        throw new NotFoundException(`找不到 ID 為 ${trimmedJobId} 的任務`);
      }

      this.logger.log(
        `成功獲取任務 ${trimmedJobId} 狀態: ${job.status}` +
          `${job.novel ? `, 小說: ${job.novel.title}` : ''}`,
      );

      return this.mapToResponseDto(job);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`查詢任務 ${trimmedJobId} 狀態失敗`, error.stack);

      // 記錄詳細的錯誤信息
      if (error instanceof Error) {
        this.logger.error(`錯誤詳情: ${error.message}`);
      }

      throw new Error(`查詢任務狀態失敗: ${error.message}`);
    }
  }

  /**
   * 將領域實體映射為回應 DTO
   */
  private mapToResponseDto(job: EpubJob): JobStatusResponseDto {
    return {
      success: true,
      jobId: job.id,
      novelId: job.novelId,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
      message: this.getStatusMessage(job.status),
    };
  }

  /**
   * 根據任務狀態獲取相應的消息
   */
  private getStatusMessage(status: string): string {
    switch (status) {
      case 'QUEUED':
        return '任務已排隊，等待處理';
      case 'PROCESSING':
        return '任務正在處理中';
      case 'COMPLETED':
        return '任務已完成';
      case 'FAILED':
        return '任務處理失敗';
      default:
        return '任務狀態未知';
    }
  }
}

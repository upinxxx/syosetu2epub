import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  EpubJobRepository,
  EPUB_JOB_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * 獲取下載連結 UseCase
 */
@Injectable()
export class GetDownloadLinkUseCase {
  private readonly logger = new Logger(GetDownloadLinkUseCase.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: EpubJobRepository,
  ) {}

  /**
   * 獲取 EPUB 下載連結
   * @param jobId 任務ID
   * @returns 下載連結信息
   */
  async execute(jobId: string) {
    this.logger.log(`獲取下載連結請求 - 任務ID: ${jobId}`);

    // 嚴格的參數驗證
    if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
      const errorMsg = `無效的任務ID: ${jobId}`;
      this.logger.error(errorMsg);
      throw new BadRequestException('任務ID不能為空');
    }

    const trimmedJobId = jobId.trim();

    // 檢查任務ID格式（UUID格式）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedJobId)) {
      const errorMsg = `任務ID格式不正確: ${trimmedJobId}`;
      this.logger.error(errorMsg);
      throw new BadRequestException('任務ID格式不正確');
    }

    try {
      this.logger.debug(`開始查詢任務 ${trimmedJobId} 的下載連結`);

      const job = await this.epubJobRepository.findById(trimmedJobId);

      if (!job) {
        this.logger.warn(`找不到任務: ${trimmedJobId}`);
        throw new NotFoundException(`找不到 ID 為 ${trimmedJobId} 的任務`);
      }

      // 檢查任務狀態
      if (job.status !== JobStatus.COMPLETED) {
        this.logger.warn(
          `任務 ${trimmedJobId} 尚未完成，當前狀態: ${job.status}` +
            `${job.novel ? `, 小說: ${job.novel.title}` : ''}`,
        );
        throw new BadRequestException(`任務尚未完成，當前狀態: ${job.status}`);
      }

      // 檢查下載連結是否存在
      if (!job.publicUrl) {
        this.logger.error(
          `任務 ${trimmedJobId} 已完成但缺少下載連結` +
            `${job.novel ? `, 小說: ${job.novel.title}` : ''}`,
        );
        throw new BadRequestException('下載連結不可用');
      }

      // 驗證下載連結格式
      try {
        new URL(job.publicUrl);
      } catch (urlError) {
        this.logger.error(
          `任務 ${trimmedJobId} 的下載連結格式無效: ${job.publicUrl}`,
        );
        throw new BadRequestException('下載連結格式無效');
      }

      this.logger.log(
        `成功獲取任務 ${trimmedJobId} 的下載連結` +
          `${job.novel ? `, 小說: ${job.novel.title}` : ''}` +
          `, URL: ${job.publicUrl}`,
      );

      return {
        success: true,
        jobId: job.id,
        novelId: job.novelId,
        novelTitle: job.novel?.title,
        status: job.status,
        publicUrl: job.publicUrl,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        message: '下載連結獲取成功',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(`獲取任務 ${trimmedJobId} 下載連結失敗`, error.stack);

      // 記錄詳細的錯誤信息
      if (error instanceof Error) {
        this.logger.error(`錯誤詳情: ${error.message}`);
      }

      throw new Error(`獲取下載連結失敗: ${error.message}`);
    }
  }
}

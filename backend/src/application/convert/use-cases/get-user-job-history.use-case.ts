import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EpubJobRepository,
  EPUB_JOB_REPOSITORY_TOKEN,
  PagedResult,
} from '@/domain/ports/repository/index.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';

export interface UserJobHistoryDto {
  id: string;
  novelId: string;
  novelTitle?: string;
  status: string;
  createdAt: Date;
  completedAt?: Date;
  publicUrl?: string;
  errorMessage?: string;
}

export interface UserJobHistoryResponseDto {
  success: boolean;
  jobs: UserJobHistoryDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

@Injectable()
export class GetUserJobHistoryUseCase {
  private readonly logger = new Logger(GetUserJobHistoryUseCase.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: EpubJobRepository,
  ) {}

  /**
   * 獲取用戶任務歷史
   */
  async execute(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<UserJobHistoryResponseDto> {
    this.logger.log(
      `獲取用戶任務歷史請求 - 用戶ID: ${userId}, 頁數: ${page}, 限制: ${limit}`,
    );

    // 嚴格的參數驗證
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      const errorMsg = `無效的用戶ID: ${userId}`;
      this.logger.error(errorMsg);
      throw new Error('用戶ID不能為空');
    }

    const trimmedUserId = userId.trim();

    // 檢查用戶ID格式（UUID格式）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedUserId)) {
      const errorMsg = `用戶ID格式不正確: ${trimmedUserId}`;
      this.logger.error(errorMsg);
      throw new Error('用戶ID格式不正確');
    }

    // 頁數驗證
    if (!Number.isInteger(page) || page < 1) {
      this.logger.warn(`無效的頁數: ${page}，使用預設值 1`);
      page = 1;
    }

    // 限制數量驗證
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      this.logger.warn(`無效的限制數量: ${limit}，使用預設值 10`);
      limit = Math.min(Math.max(1, limit), 100); // 確保在 1-100 範圍內
    }

    try {
      this.logger.debug(`開始查詢用戶 ${trimmedUserId} 的任務歷史`);

      const result = await this.epubJobRepository.findByUserIdPaginated(
        trimmedUserId,
        page,
        limit,
      );

      this.logger.log(
        `成功獲取用戶 ${trimmedUserId} 的任務歷史 - ` +
          `總記錄數: ${result.total}, 當前頁記錄數: ${result.items.length}, ` +
          `頁數: ${result.page}/${Math.ceil(result.total / result.limit)}`,
      );

      const jobs = result.items.map((job) => this.mapToDto(job));

      return {
        success: true,
        jobs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasMore: result.hasMore,
        },
      };
    } catch (error) {
      this.logger.error(`獲取用戶 ${trimmedUserId} 任務歷史失敗`, error.stack);

      // 記錄詳細的錯誤信息
      if (error instanceof Error) {
        this.logger.error(`錯誤詳情: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * 獲取用戶最近的任務
   */
  async getRecentJobs(
    userId: string,
    withinDays: number = 7,
  ): Promise<UserJobHistoryDto[]> {
    this.logger.log(
      `獲取用戶最近任務請求 - 用戶ID: ${userId}, 天數: ${withinDays}`,
    );

    // 嚴格的參數驗證
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      const errorMsg = `無效的用戶ID: ${userId}`;
      this.logger.error(errorMsg);
      throw new Error('用戶ID不能為空');
    }

    const trimmedUserId = userId.trim();

    // 檢查用戶ID格式（UUID格式）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedUserId)) {
      const errorMsg = `用戶ID格式不正確: ${trimmedUserId}`;
      this.logger.error(errorMsg);
      throw new Error('用戶ID格式不正確');
    }

    // 天數驗證
    if (!Number.isInteger(withinDays) || withinDays < 1 || withinDays > 365) {
      this.logger.warn(`無效的天數範圍: ${withinDays}，使用預設值 7`);
      withinDays = Math.min(Math.max(1, withinDays), 365); // 確保在 1-365 範圍內
    }

    try {
      this.logger.debug(
        `開始查詢用戶 ${trimmedUserId} 最近 ${withinDays} 天的任務`,
      );

      const jobs = await this.epubJobRepository.findRecentByUserId(
        trimmedUserId,
        withinDays,
      );

      this.logger.log(
        `成功獲取用戶 ${trimmedUserId} 最近 ${withinDays} 天的任務 - ` +
          `共 ${jobs.length} 筆記錄`,
      );

      return jobs.map((job) => this.mapToDto(job));
    } catch (error) {
      this.logger.error(`獲取用戶 ${trimmedUserId} 最近任務失敗`, error.stack);

      // 記錄詳細的錯誤信息
      if (error instanceof Error) {
        this.logger.error(`錯誤詳情: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * 將領域實體映射為 DTO
   */
  private mapToDto(job: EpubJob): UserJobHistoryDto {
    return {
      id: job.id,
      novelId: job.novelId,
      novelTitle: job.novel?.title,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      publicUrl: job.publicUrl,
      errorMessage: job.errorMessage,
    };
  }
}

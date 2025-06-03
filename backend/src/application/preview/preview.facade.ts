import { Injectable, Inject, Logger } from '@nestjs/common';
import { AddPreviewJobUseCase } from './use-cases/add-preview-job.use-case.js';
import { GetNovelPreviewUseCase } from './use-cases/get-novel-preview.use-case.js';
import { GetPreviewJobStatusUseCase } from './use-cases/get-preview-job-status.use-case.js';
import { PreviewNovelUseCase } from './use-cases/preview-novel.use-case.js';
import { ProcessPreviewUseCase } from './use-cases/process-preview-job.use-case.js';
import { PreviewCacheService } from './services/preview-cache.service.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { PreviewNovelJobData } from '@/shared/dto/preview-novel-job-data.dto.js';

// 新增錯誤類型定義
class PreviewFacadeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'PreviewFacadeError';
  }
}

/**
 * 預覽回應介面
 */
export interface PreviewWithCacheResponse {
  success: boolean;
  cached: boolean;
  preview?: {
    novelId: string;
    title: string;
    author: string;
    description: string;
    source: NovelSource;
    sourceId: string;
  };
  jobId?: string;
  message: string;
  timestamp: string;
}

/**
 * 預覽功能門面
 * 增強版本：統一錯誤處理、改善快取管理、詳細日誌記錄
 */
@Injectable()
export class PreviewFacade {
  private readonly logger = new Logger(PreviewFacade.name);

  constructor(
    @Inject(AddPreviewJobUseCase)
    private readonly addPreviewJob: AddPreviewJobUseCase,
    @Inject(GetNovelPreviewUseCase)
    private readonly getNovelPreview: GetNovelPreviewUseCase,
    @Inject(GetPreviewJobStatusUseCase)
    private readonly getPreviewJobStatus: GetPreviewJobStatusUseCase,
    @Inject(PreviewNovelUseCase)
    private readonly previewNovel: PreviewNovelUseCase,
    @Inject(ProcessPreviewUseCase)
    private readonly processPreviewJob: ProcessPreviewUseCase,
    @Inject(PreviewCacheService)
    private readonly previewCacheService: PreviewCacheService,
  ) {}

  /**
   * 統一的預覽處理方法（整合緩存機制）
   * 優先檢查緩存，未命中則建立非同步任務
   */
  async getPreviewWithCache(
    source: NovelSource,
    sourceId: string,
    userId?: string,
  ): Promise<PreviewWithCacheResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] 開始預覽處理 - source: ${source}, sourceId: ${sourceId}, userId: ${userId || 'anonymous'}`,
    );

    try {
      // 驗證參數
      this.validatePreviewParams(source, sourceId, requestId);

      // 1. 先檢查緩存
      const cachedPreview = await this.checkCache(source, sourceId, requestId);

      if (cachedPreview) {
        const duration = Date.now() - startTime;
        this.logger.log(
          `[${requestId}] 預覽快取命中 - 來源: ${cachedPreview.cacheLevel}, 執行時間: ${duration}ms`,
        );

        return {
          success: true,
          cached: true,
          preview: {
            novelId: cachedPreview.data.novelId,
            title: cachedPreview.data.title,
            author: cachedPreview.data.author,
            description: cachedPreview.data.description,
            source: cachedPreview.data.source,
            sourceId: cachedPreview.data.sourceId,
          },
          message: `從${cachedPreview.cacheLevel}獲取預覽資料`,
          timestamp: new Date().toISOString(),
        };
      }

      // 2. 緩存未命中，創建非同步任務
      this.logger.log(`[${requestId}] 快取未命中，創建預覽任務`);

      const jobId = await this.addPreviewJob.execute(source, sourceId);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] 預覽任務創建成功 - jobId: ${jobId}, 執行時間: ${duration}ms`,
      );

      return {
        success: true,
        cached: false,
        jobId: jobId,
        message: '預覽任務已創建，請輪詢狀態',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 預覽處理失敗 - source: ${source}, sourceId: ${sourceId}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      if (error instanceof PreviewFacadeError) {
        return {
          success: false,
          cached: false,
          message: error.message,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: false,
        cached: false,
        message: `預覽處理失敗: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 提交預覽任務（保持向後相容）
   */
  async submitPreviewJob(
    source: NovelSource,
    sourceId: string,
    userId?: string,
  ) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] 提交預覽任務 - source: ${source}, sourceId: ${sourceId}`,
    );

    try {
      this.validatePreviewParams(source, sourceId, requestId);

      const jobId = await this.addPreviewJob.execute(source, sourceId);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] 預覽任務提交成功 - jobId: ${jobId}, 執行時間: ${duration}ms`,
      );

      return jobId;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 預覽任務提交失敗 - 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      if (error instanceof PreviewFacadeError) {
        throw error;
      }

      throw new PreviewFacadeError(
        '預覽任務提交失敗',
        'SUBMIT_PREVIEW_JOB_FAILED',
        500,
        {
          originalError: error.message,
          source,
          sourceId,
          requestId,
        },
      );
    }
  }

  /**
   * 根據小說 ID 獲取預覽
   */
  async getPreviewById(id: string) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(`[${requestId}] 根據ID獲取預覽 - id: ${id}`);

    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new PreviewFacadeError(
          '小說ID不能為空',
          'INVALID_NOVEL_ID',
          400,
          { id, type: typeof id },
        );
      }

      const result = await this.getNovelPreview.execute(id);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] 預覽獲取成功 - id: ${id}, 執行時間: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 預覽獲取失敗 - id: ${id}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      if (error instanceof PreviewFacadeError) {
        throw error;
      }

      throw new PreviewFacadeError(
        '預覽獲取失敗',
        'GET_PREVIEW_BY_ID_FAILED',
        500,
        {
          originalError: error.message,
          id,
          requestId,
        },
      );
    }
  }

  /**
   * 獲取任務狀態（增強版本）
   */
  async getJobStatus(jobId: string) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.debug(`[${requestId}] 查詢預覽任務狀態 - jobId: ${jobId}`);

    try {
      if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
        throw new PreviewFacadeError('任務ID不能為空', 'INVALID_JOB_ID', 400, {
          jobId,
          type: typeof jobId,
        });
      }

      const result = await this.getPreviewJobStatus.execute(jobId);

      const duration = Date.now() - startTime;
      this.logger.debug(
        `[${requestId}] 預覽任務狀態查詢完成 - jobId: ${jobId}, status: ${result.status}, 執行時間: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 預覽任務狀態查詢失敗 - jobId: ${jobId}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      if (error instanceof PreviewFacadeError) {
        throw error;
      }

      throw new PreviewFacadeError(
        '預覽任務狀態查詢失敗',
        'GET_JOB_STATUS_FAILED',
        500,
        {
          originalError: error.message,
          jobId,
          requestId,
        },
      );
    }
  }

  /**
   * 同步預覽方法（保持向後相容，但建議使用 getPreviewWithCache）
   */
  async getPreviewBySource(source: NovelSource, sourceId: string) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] 同步預覽 - source: ${source}, sourceId: ${sourceId}`,
    );

    try {
      this.validatePreviewParams(source, sourceId, requestId);

      const result = await this.previewNovel.execute(source, sourceId);

      const duration = Date.now() - startTime;
      this.logger.log(`[${requestId}] 同步預覽完成 - 執行時間: ${duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 同步預覽失敗 - 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      if (error instanceof PreviewFacadeError) {
        throw error;
      }

      throw new PreviewFacadeError('同步預覽失敗', 'SYNC_PREVIEW_FAILED', 500, {
        originalError: error.message,
        source,
        sourceId,
        requestId,
      });
    }
  }

  /**
   * 處理預覽任務
   */
  async processJob(jobData: PreviewNovelJobData) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(`[${requestId}] 處理預覽任務 - jobId: ${jobData.jobId}`);

    try {
      if (!jobData || !jobData.jobId) {
        throw new PreviewFacadeError('任務數據無效', 'INVALID_JOB_DATA', 400, {
          jobData,
        });
      }

      const result = await this.processPreviewJob.execute(jobData);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] 預覽任務處理完成 - jobId: ${jobData.jobId}, 執行時間: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 預覽任務處理失敗 - jobId: ${jobData.jobId}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      if (error instanceof PreviewFacadeError) {
        throw error;
      }

      throw new PreviewFacadeError(
        '預覽任務處理失敗',
        'PROCESS_PREVIEW_JOB_FAILED',
        500,
        {
          originalError: error.message,
          jobId: jobData.jobId,
          requestId,
        },
      );
    }
  }

  /**
   * 驗證預覽參數
   */
  private validatePreviewParams(
    source: NovelSource,
    sourceId: string,
    requestId: string,
  ): void {
    if (!source || !Object.values(NovelSource).includes(source)) {
      throw new PreviewFacadeError(
        '小說來源無效',
        'INVALID_NOVEL_SOURCE',
        400,
        { source, validSources: Object.values(NovelSource), requestId },
      );
    }

    if (
      !sourceId ||
      typeof sourceId !== 'string' ||
      sourceId.trim().length === 0
    ) {
      throw new PreviewFacadeError(
        '小說來源ID不能為空',
        'INVALID_SOURCE_ID',
        400,
        { sourceId, type: typeof sourceId, requestId },
      );
    }

    // 進階驗證：檢查 sourceId 格式是否符合來源要求
    if (source === NovelSource.NAROU && !this.isValidNarouId(sourceId)) {
      throw new PreviewFacadeError(
        'Narou小說ID格式無效',
        'INVALID_NAROU_ID_FORMAT',
        400,
        { sourceId, expectedFormat: 'n1234a', requestId },
      );
    }
  }

  /**
   * 檢查緩存（簡化版本）
   */
  private async checkCache(
    source: NovelSource,
    sourceId: string,
    requestId: string,
  ) {
    this.logger.debug(`[${requestId}] 檢查緩存`);

    try {
      // 檢查 Redis 緩存（15分鐘）
      const cachedPreview = await this.previewCacheService.getCachedPreview(
        source,
        sourceId,
      );
      if (cachedPreview) {
        this.logger.debug(`[${requestId}] Redis緩存命中`);
        return { data: cachedPreview, cacheLevel: 'Redis緩存' };
      }

      this.logger.debug(`[${requestId}] 緩存未命中`);
      return null;
    } catch (error) {
      this.logger.warn(`[${requestId}] 緩存檢查失敗: ${error.message}`);
      return null;
    }
  }

  /**
   * 驗證 Narou ID 格式
   */
  private isValidNarouId(id: string): boolean {
    // Narou ID 格式: n + 數字 + 一個或多個字母
    // 例如: n1234a, n7612kn, n123456abc
    const narouIdRegex = /^n\d+[a-z]+$/i;
    return narouIdRegex.test(id);
  }

  /**
   * 生成請求ID用於日誌追蹤
   */
  private generateRequestId(): string {
    return `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

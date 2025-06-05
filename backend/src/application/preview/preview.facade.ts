import { Injectable, Inject } from '@nestjs/common';
import { AddPreviewJobUseCase } from './use-cases/add-preview-job.use-case.js';
import { GetNovelPreviewUseCase } from './use-cases/get-novel-preview.use-case.js';
import { GetPreviewJobStatusUseCase } from './use-cases/get-preview-job-status.use-case.js';
import { ProcessPreviewUseCase } from './use-cases/process-preview-job.use-case.js';
import { PreviewCacheService } from './services/preview-cache.service.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { PreviewNovelJobData } from '@/shared/dto/preview-novel-job-data.dto.js';

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
 * 🔧 優化：移除冗餘依賴和方法
 */
@Injectable()
export class PreviewFacade {
  constructor(
    @Inject(AddPreviewJobUseCase)
    private readonly addPreviewJob: AddPreviewJobUseCase,
    @Inject(GetNovelPreviewUseCase)
    private readonly getNovelPreview: GetNovelPreviewUseCase,
    @Inject(GetPreviewJobStatusUseCase)
    private readonly getPreviewJobStatus: GetPreviewJobStatusUseCase,
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
    // 🔧 直接檢查緩存，簡化邏輯
    const cachedPreview = await this.previewCacheService.getCachedPreview(
      source,
      sourceId,
    );

    if (cachedPreview) {
      return {
        success: true,
        cached: true,
        preview: {
          novelId: cachedPreview.novelId,
          title: cachedPreview.title,
          author: cachedPreview.author,
          description: cachedPreview.description,
          source: cachedPreview.source,
          sourceId: cachedPreview.sourceId,
        },
        message: '從緩存獲取預覽資料',
        timestamp: new Date().toISOString(),
      };
    }

    // 緩存未命中，創建非同步任務
    const jobId = await this.addPreviewJob.execute(source, sourceId);

    return {
      success: true,
      cached: false,
      jobId: jobId,
      message: '預覽任務已創建，請輪詢狀態',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 提交預覽任務（保持向後相容）
   */
  async submitPreviewJob(
    source: NovelSource,
    sourceId: string,
    userId?: string,
  ) {
    return this.addPreviewJob.execute(source, sourceId);
  }

  /**
   * 根據 ID 獲取預覽
   */
  async getPreviewById(id: string) {
    return this.getNovelPreview.execute(id);
  }

  /**
   * 獲取預覽任務狀態
   */
  async getJobStatus(jobId: string) {
    return this.getPreviewJobStatus.execute(jobId);
  }

  /**
   * 處理預覽任務
   */
  async processJob(jobData: PreviewNovelJobData) {
    return this.processPreviewJob.execute(jobData);
  }
}

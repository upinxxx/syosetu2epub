// src/presentation/novel.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Logger,
  Inject,
} from '@nestjs/common';
import { PreviewNovelDto } from '../shared/dto/preview-novel.dto.js';
import { PreviewFacade } from '@/application/preview/preview.facade.js';

/**
 * 小說 Controller
 * 處理與小說預覽相關的 HTTP 請求
 * 遵循六角架構：僅依賴 PreviewFacade，無直接業務邏輯
 */
@Controller('novels')
export class NovelController {
  private readonly logger = new Logger(NovelController.name);

  constructor(
    @Inject(PreviewFacade) private readonly previewFacade: PreviewFacade,
  ) {}

  /**
   * 提交小說預覽任務
   * POST /api/v1/novels/preview
   */
  @Post('preview')
  async preview(@Body() dto: PreviewNovelDto) {
    this.logger.log(`預覽請求: ${JSON.stringify(dto)}`);

    // 使用統一的緩存預覽方法
    const result = await this.previewFacade.getPreviewWithCache(
      dto.source,
      dto.sourceId,
    );

    // 包裝成統一的 API 回應格式
    return {
      success: result.success,
      data: {
        cached: result.cached,
        preview: result.preview,
        jobId: result.jobId,
      },
      message: result.message,
      timestamp: result.timestamp,
    };
  }

  /**
   * 獲取預覽任務狀態
   * GET /api/v1/novels/preview/:jobId
   */
  @Get('preview/:jobId')
  async getPreviewStatus(@Param('jobId') jobId: string) {
    this.logger.log(`獲取預覽狀態: ${jobId}`);
    const result = await this.previewFacade.getJobStatus(jobId);

    // 包裝成統一的 API 回應格式
    return {
      success: result.success || true,
      data: result,
      message: result.message || '預覽狀態獲取成功',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 根據小說 ID 獲取預覽
   * GET /api/v1/novels/:id/preview
   */
  @Get(':id/preview')
  async getPreviewById(@Param('id') id: string) {
    this.logger.log(`根據 ID 獲取預覽: ${id}`);
    const result = await this.previewFacade.getPreviewById(id);

    // 包裝成統一的 API 回應格式
    return {
      success: result.success || true,
      data: result,
      message: result.message || '預覽獲取成功',
      timestamp: new Date().toISOString(),
    };
  }
}

// src/presentation/novel.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Logger,
  HttpStatus,
  HttpCode,
  Res,
  Request,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { PreviewNovelDto } from '../shared/dto/preview-novel.dto.js';
import { ConvertNovelDto } from '../shared/dto/convert-novel.dto.js';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { PreviewFacade } from '@/application/preview/preview.facade.js';
import { ConvertFacade } from '@/application/convert/convert.facade.js';

/**
 * 小說 Controller
 * 處理與小說相關的 HTTP 請求
 */
@Controller('novels')
export class NovelController {
  private readonly logger = new Logger(NovelController.name);

  constructor(
    @Inject(ConvertFacade) private readonly convertFacade: ConvertFacade,
    @Inject(PreviewFacade) private readonly previewFacade: PreviewFacade,
  ) {}

  /**
   * 提交小說轉換任務
   */
  @Post('convert')
  @UseGuards(AuthGuard(['jwt', 'anonymous']))
  async convert(@Body() dto: ConvertNovelDto, @Request() req) {
    this.logger.log(`提交小說轉換任務: ${JSON.stringify(dto)}`);
    // 將 req.user 傳遞給 Facade，讓應用層處理用戶身份邏輯
    return this.convertFacade.submitJob(dto.novelId, req.user);
  }

  /**
   * 添加預覽任務
   */
  @Post('preview')
  async preview(@Body() dto: PreviewNovelDto) {
    this.logger.log(`預覽請求: ${JSON.stringify(dto)}`);

    // 使用 previewNovelFromUrl 方法
    const result = await this.previewFacade.getPreviewBySource(
      dto.source,
      dto.sourceId,
    );

    // 返回結果
    return {
      success: true,
      novelId: result.novelId,
      message: `成功取得小說預覽資料`,
    };
  }

  /**
   * 獲取預覽任務狀態
   */
  @Get('preview-status/:jobId')
  async previewStatus(@Param('jobId') id: string) {
    return this.previewFacade.getJobStatus(id);
  }

  /**
   * 根據小說 ID 獲取預覽
   */
  @Get('preview/:id')
  async previewById(@Param('id') id: string) {
    return this.previewFacade.getPreviewById(id);
  }

  /**
   * 查詢任務狀態
   */
  @Get('convert/:jobId/status')
  async convertStatus(@Param('jobId') id: string) {
    return this.convertFacade.getJobStatus(id);
  }

  /**
   * 獲取轉換結果下載連結
   */
  @Get('convert/:jobId/file')
  @HttpCode(HttpStatus.OK)
  async download(
    @Param('jobId') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.convertFacade.getDownloadUrl(id);
  }
}

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
import { ConvertNovelDto } from '../shared/dto/convert-novel.dto.js';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConvertFacade } from '@/application/convert/convert.facade.js';

/**
 * 轉檔 Controller
 * 處理與小說轉檔相關的 HTTP 請求
 * 遵循六角架構：僅依賴 ConvertFacade，無直接業務邏輯
 */
@Controller('conversions')
export class ConversionController {
  private readonly logger = new Logger(ConversionController.name);

  constructor(
    @Inject(ConvertFacade) private readonly convertFacade: ConvertFacade,
  ) {}

  /**
   * 提交轉檔任務
   * POST /api/v1/conversions
   */
  @Post()
  @UseGuards(AuthGuard(['jwt', 'anonymous']))
  async createConversion(@Body() dto: ConvertNovelDto, @Request() req) {
    this.logger.log(`提交轉檔任務: ${JSON.stringify(dto)}`);
    // 將 req.user 傳遞給 Facade，讓應用層處理用戶身份邏輯
    return this.convertFacade.submitJob(dto.novelId, req.user);
  }

  /**
   * 獲取轉檔狀態
   * GET /api/v1/conversions/:jobId
   */
  @Get(':jobId')
  async getConversionStatus(@Param('jobId') jobId: string) {
    this.logger.log(`查詢轉檔狀態: ${jobId}`);
    return this.convertFacade.getJobStatus(jobId);
  }

  /**
   * 獲取轉檔結果下載連結
   * GET /api/v1/conversions/:jobId/file
   */
  @Get(':jobId/file')
  @HttpCode(HttpStatus.OK)
  async getDownloadUrl(
    @Param('jobId') jobId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`獲取下載連結: ${jobId}`);
    return this.convertFacade.getDownloadUrl(jobId);
  }
}

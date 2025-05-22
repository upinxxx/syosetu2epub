// src/presentation/novel.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  HttpStatus,
  HttpCode,
  Res,
} from '@nestjs/common';
import { PreviewNovelDto } from '../shared/dto/preview-novel.dto.js';
import { PreviewNovelResponseDto } from '../application/dto/preview-novel-response.dto.js';
import { ConvertNovelDto } from '../shared/dto/convert-novel.dto.js';
import { SubmitJobResponseDto } from '../application/dto/submit-job-response.dto.js';
import { JobStatusResponseDto } from '../shared/dto/job-status.dto.js';
import { PreviewNovelUseCase } from '../application/use-cases/preview-novel.use-case.js';
import { SubmitJobUseCase } from '../application/use-cases/submit-job.use-case.js';
import { GetJobStatusUseCase } from '../application/use-cases/get-job-status.use-case.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';
import { NOVEL_REPOSITORY_TOKEN } from '../infrastructure/repositories/repositories.module.js';
import { PagedRepository } from '../domain/ports/repository.port.js';
import { Novel } from '../domain/entities/novel.entity.js';
import { Response } from 'express';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
/**
 * 小說 Controller
 * 處理與小說相關的 HTTP 請求
 */
@Controller('novels')
export class NovelController {
  private readonly logger = new Logger(NovelController.name);

  constructor(
    @Inject(PreviewNovelUseCase)
    private readonly previewNovelUseCase: PreviewNovelUseCase,
    @Inject(SubmitJobUseCase)
    private readonly submitJobUseCase: SubmitJobUseCase,
    @Inject(GetJobStatusUseCase)
    private readonly getJobStatusUseCase: GetJobStatusUseCase,
    @Inject(NOVEL_REPOSITORY_TOKEN)
    private readonly novelRepository: PagedRepository<Novel>,
  ) {}

  /**
   * 提交小說轉換任務
   */
  @Post('convert')
  async convert(
    @Body() convertDto: ConvertNovelDto,
  ): Promise<SubmitJobResponseDto> {
    this.logger.log(`提交小說轉換任務: ${JSON.stringify(convertDto)}`);

    try {
      // 使用 SubmitJobUseCase 處理任務提交
      const result = await this.submitJobUseCase.execute(convertDto.novelId);

      return {
        success: true,
        jobId: result.jobId,
        novelId: convertDto.novelId,
        status: JobStatus.QUEUED,
        createdAt: new Date(),
        message: `小說轉換任務已提交，任務 ID: ${result.jobId}`,
      };
    } catch (error) {
      this.logger.error(`轉換任務提交失敗: ${error.message}`, error.stack);
      throw error; // 讓 NestJS 的異常過濾器處理錯誤回應
    }
  }

  /**
   * 取得小說預覽
   */
  @Post('preview')
  async preview(@Body() previewDto: PreviewNovelDto): Promise<{
    success: boolean;
    preview: PreviewNovelResponseDto;
    message: string;
  }> {
    this.logger.log(`預覽請求: ${JSON.stringify(previewDto)}`);

    try {
      // 使用 PreviewNovelUseCase 獲取小說預覽
      const preview = await this.previewNovelUseCase.execute(
        previewDto.source,
        previewDto.sourceId,
      );

      return {
        success: true,
        preview,
        message: `成功獲取 ${previewDto.source} 站點小說預覽`,
      };
    } catch (error) {
      this.logger.error(`預覽失敗: ${error.message}`, error.stack);
      throw error; // 讓 NestJS 的異常過濾器處理錯誤回應
    }
  }

  /**
   * 根據小說 ID 獲取預覽
   */
  @Get('preview/:id')
  async getPreviewById(@Param('id') id: string): Promise<{
    success: boolean;
    preview: PreviewNovelResponseDto;
    message: string;
  }> {
    this.logger.log(`獲取小說 ID ${id} 的預覽`);

    try {
      // 這個方法需要先查找小說，然後再調用預覽方法
      // 在實際實現中，應該擴展 PreviewNovelUseCase 或創建新的 UseCase
      const novel = await this.novelRepository.findById(id);

      if (!novel) {
        throw new NotFoundException(`找不到 ID 為 ${id} 的小說`);
      }

      const preview = await this.previewNovelUseCase.execute(
        novel.source as NovelSource,
        novel.sourceId,
      );

      return {
        success: true,
        preview,
        message: `成功獲取小說 ${novel.title} 的預覽`,
      };
    } catch (error) {
      this.logger.error(`獲取預覽失敗: ${error.message}`, error.stack);
      throw error; // 讓 NestJS 的異常過濾器處理錯誤回應
    }
  }

  /**
   * 查詢任務狀態
   */
  @Get('convert/:jobId/status')
  async getJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<JobStatusResponseDto> {
    this.logger.log(`查詢任務狀態: ${jobId}`);

    try {
      // 使用 GetJobStatusUseCase 獲取任務狀態
      return await this.getJobStatusUseCase.execute(jobId);
    } catch (error) {
      this.logger.error(`查詢任務狀態失敗: ${error.message}`, error.stack);
      throw error; // 讓 NestJS 的異常過濾器處理錯誤回應
    }
  }

  /**
   * 獲取轉換結果下載連結
   */
  @Get('convert/:jobId/file')
  @HttpCode(HttpStatus.OK)
  async getDownloadLink(
    @Param('jobId') jobId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; publicUrl?: string; message: string }> {
    this.logger.log(`獲取下載連結: ${jobId}`);

    try {
      // 使用 GetJobStatusUseCase 獲取任務信息
      const jobStatus = await this.getJobStatusUseCase.execute(jobId);

      if (jobStatus.status !== JobStatus.COMPLETED) {
        return {
          success: false,
          message: `任務 ${jobId} 尚未完成，目前狀態: ${jobStatus.status}`,
        };
      }

      if (!jobStatus.publicUrl) {
        return {
          success: false,
          message: `任務 ${jobId} 完成但沒有可用的下載連結`,
        };
      }

      return {
        success: true,
        publicUrl: jobStatus.publicUrl,
        message: '成功獲取下載連結',
      };
    } catch (error) {
      this.logger.error(`獲取下載連結失敗: ${error.message}`, error.stack);
      throw error; // 讓 NestJS 的異常過濾器處理錯誤回應
    }
  }
}

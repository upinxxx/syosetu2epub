import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { QUEUE_PORT_TOKEN, QueuePort } from '@/domain/ports/queue.port.js';
import {
  NOVEL_REPOSITORY_TOKEN,
  PagedRepository,
} from '@/domain/ports/repository/index.js';
import { Novel } from '@/domain/entities/novel.entity.js';
import { PreviewNovelResponseDto } from '../dto/preview-novel-response.dto.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * 獲取預覽任務狀態 UseCase
 */
@Injectable()
export class GetPreviewJobStatusUseCase {
  private readonly logger = new Logger(GetPreviewJobStatusUseCase.name);

  constructor(
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueService: QueuePort,
    @Inject(NOVEL_REPOSITORY_TOKEN)
    private readonly novelRepository: PagedRepository<Novel>,
  ) {}

  /**
   * 獲取預覽任務狀態
   * @param jobId 任務 ID
   * @returns 預覽任務狀態和結果
   */
  async execute(jobId: string): Promise<{
    success: boolean;
    status: string;
    preview?: PreviewNovelResponseDto;
    message: string;
  }> {
    this.logger.log(`🔍 獲取預覽任務狀態: ${jobId}`);

    try {
      // 從緩存中獲取任務狀態
      const cachedStatus = await this.queueService.getCachedJobStatus(
        'preview',
        jobId,
      );

      this.logger.debug(`📋 緩存狀態查詢結果: ${JSON.stringify(cachedStatus)}`);

      if (!cachedStatus) {
        this.logger.warn(`❌ 找不到預覽任務: ${jobId}`);
        throw new NotFoundException(`找不到預覽任務 ${jobId}`);
      }

      this.logger.log(`📊 任務 ${jobId} 當前狀態: ${cachedStatus.status}`);

      // 如果任務已完成，獲取預覽結果
      if (cachedStatus.status === JobStatus.COMPLETED) {
        this.logger.log(`✅ 任務 ${jobId} 已完成，準備返回預覽數據`);

        // 首先檢查緩存是否包含預覽數據
        if (cachedStatus.previewData) {
          this.logger.log(`📦 從緩存中獲取預覽數據: ${jobId}`);
          this.logger.debug(
            `📦 預覽數據內容: ${JSON.stringify(cachedStatus.previewData)}`,
          );

          const result = {
            success: true,
            status: cachedStatus.status,
            message: '預覽任務已完成',
            preview: cachedStatus.previewData,
          };

          this.logger.log(`🚀 返回完成狀態: ${JSON.stringify(result)}`);
          return result;
        }

        // 如果緩存中沒有預覽數據，則嘗試從資料庫獲取
        this.logger.log(`🔍 緩存中無預覽數據，嘗試從任務數據重建: ${jobId}`);

        // 根據任務 ID 查找對應的小說
        const jobData = await this.queueService.getJobData('preview', jobId);

        if (!jobData) {
          this.logger.warn(`⚠️ 任務 ${jobId} 已完成，但無法獲取任務數據`);
          const result = {
            success: true,
            status: cachedStatus.status,
            message: '任務已完成，但無法獲取預覽數據',
          };
          this.logger.log(`🚀 返回完成狀態(無數據): ${JSON.stringify(result)}`);
          return result;
        }

        // 檢查 jobData 是否包含必要字段
        if (!jobData.source || !jobData.sourceId) {
          this.logger.warn(
            `⚠️ 任務 ${jobId} 數據缺少必要字段: ${JSON.stringify(jobData)}`,
          );
          const result = {
            success: true,
            status: cachedStatus.status,
            message: '任務已完成，但預覽數據不完整',
          };
          this.logger.log(
            `🚀 返回完成狀態(數據不完整): ${JSON.stringify(result)}`,
          );
          return result;
        }

        this.logger.debug(`📋 獲取到任務數據: ${JSON.stringify(jobData)}`);

        // 查找小說
        const novel = await (
          this.novelRepository as any
        ).findBySourceAndSourceId(jobData.source, jobData.sourceId);

        if (!novel) {
          this.logger.warn(
            `⚠️ 找不到小說: source=${jobData.source}, sourceId=${jobData.sourceId}`,
          );
          const result = {
            success: true,
            status: cachedStatus.status,
            message: '任務已完成，但找不到對應的小說',
          };
          this.logger.log(
            `🚀 返回完成狀態(找不到小說): ${JSON.stringify(result)}`,
          );
          return result;
        }

        // 構建預覽回應
        const preview: PreviewNovelResponseDto = {
          novelId: novel.id,
          title: novel.title,
          author: novel.author || '',
          description: novel.description || '',
          source: jobData.source,
          sourceId: jobData.sourceId,
          coverUrl: novel.coverUrl,
          novelUpdatedAt: novel.updatedAt,
        };

        this.logger.debug(`📝 構建預覽回應: ${JSON.stringify(preview)}`);

        const result = {
          success: true,
          status: cachedStatus.status,
          message: '預覽任務已完成',
          preview,
        };

        this.logger.log(
          `🚀 返回完成狀態(從數據庫重建): ${JSON.stringify(result)}`,
        );
        return result;
      }

      // 任務尚未完成
      this.logger.log(
        `⏳ 任務 ${jobId} 尚未完成，狀態: ${cachedStatus.status}`,
      );

      const result = {
        success: true,
        status: cachedStatus.status,
        message: `預覽任務狀態: ${cachedStatus.status}`,
      };

      this.logger.log(`🚀 返回進行中狀態: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(
        `❌ 獲取預覽任務狀態失敗: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { QUEUE_PORT_TOKEN, QueuePort } from '@/domain/ports/queue.port.js';
import { NOVEL_REPOSITORY_TOKEN } from '@/infrastructure/repositories/repositories.module.js';
import { PagedRepository } from '@/domain/ports/repository.port.js';
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
    this.logger.log(`獲取預覽任務狀態: ${jobId}`);

    try {
      // 從緩存中獲取任務狀態
      const cachedStatus = await this.queueService.getCachedJobStatus(
        'preview',
        jobId,
      );

      if (!cachedStatus) {
        throw new NotFoundException(`找不到預覽任務 ${jobId}`);
      }

      // 如果任務已完成，獲取預覽結果
      if (cachedStatus.status === JobStatus.COMPLETED) {
        // 首先檢查緩存是否包含預覽數據
        if (cachedStatus.previewData) {
          // this.logger.debug(
          //   `從緩存中獲取預覽數據: ${JSON.stringify(cachedStatus.previewData)}`,
          // );
          return {
            success: true,
            status: cachedStatus.status,
            message: '預覽任務已完成',
            preview: cachedStatus.previewData,
          };
        }

        // 如果緩存中沒有預覽數據，則嘗試從資料庫獲取
        // 根據任務 ID 查找對應的小說
        const jobData = await this.queueService.getJobData('preview', jobId);

        if (!jobData) {
          this.logger.warn(`任務 ${jobId} 已完成，但無法獲取任務數據`);
          return {
            success: true,
            status: cachedStatus.status,
            message: '任務已完成，但無法獲取預覽數據',
          };
        }

        // 檢查 jobData 是否包含必要字段
        if (!jobData.source || !jobData.sourceId) {
          this.logger.warn(
            `任務 ${jobId} 數據缺少必要字段: ${JSON.stringify(jobData)}`,
          );
          return {
            success: true,
            status: cachedStatus.status,
            message: '任務已完成，但預覽數據不完整',
          };
        }

        this.logger.debug(`獲取到任務數據: ${JSON.stringify(jobData)}`);

        // 查找小說
        const novel = await (
          this.novelRepository as any
        ).findBySourceAndSourceId(jobData.source, jobData.sourceId);

        if (!novel) {
          this.logger.warn(
            `找不到小說: source=${jobData.source}, sourceId=${jobData.sourceId}`,
          );
          return {
            success: true,
            status: cachedStatus.status,
            message: '任務已完成，但找不到對應的小說',
          };
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

        this.logger.debug(`構建預覽回應: ${JSON.stringify(preview)}`);

        return {
          success: true,
          status: cachedStatus.status,
          message: '預覽任務已完成',
          preview,
        };
      }

      // 任務尚未完成
      return {
        success: true,
        status: cachedStatus.status,
        message: `預覽任務狀態: ${cachedStatus.status}`,
      };
    } catch (error) {
      this.logger.error(`獲取預覽任務狀態失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}

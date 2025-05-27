import { Inject, Injectable, Logger } from '@nestjs/common';
import { PREVIEW_PROVIDER_FACTORY_TOKEN } from '@/domain/ports/preview-provider.factory.port.js';
import { PreviewProviderFactoryPort } from '@/domain/ports/preview-provider.factory.port.js';
import { QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';
import { QueuePort } from '@/domain/ports/queue.port.js';
import {
  NOVEL_REPOSITORY_TOKEN,
  PagedRepository,
} from '@/domain/ports/repository/index.js';
import { Novel } from '@/domain/entities/novel.entity.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { PreviewNovelJobData } from '../../../shared/dto/preview-novel-job-data.dto.js';
import { PreviewNovelResponseDto } from '../dto/preview-novel-response.dto.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';
/**
 * 處理預覽任務的用例
 */
@Injectable()
export class ProcessPreviewUseCase {
  private readonly logger = new Logger(ProcessPreviewUseCase.name);

  constructor(
    @Inject(PREVIEW_PROVIDER_FACTORY_TOKEN)
    private readonly previewProviderFactory: PreviewProviderFactoryPort,
    @Inject(NOVEL_REPOSITORY_TOKEN)
    private readonly novelRepository: PagedRepository<Novel>,
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueService: QueuePort,
  ) {}

  /**
   * 執行預覽任務處理
   * @param data 預覽任務數據
   */
  async execute(data: PreviewNovelJobData): Promise<PreviewNovelResponseDto> {
    const { jobId, source, sourceId } = data;
    this.logger.log(`處理預覽任務 (ID: ${jobId}): ${source}/${sourceId}`);

    try {
      // 更新任務狀態為處理中
      await this.queueService.cacheJobStatus('preview', jobId, {
        jobId,
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
      });

      // 獲取小說預覽
      const previewProvider = this.previewProviderFactory.getProvider(source);
      const novelInfo = await previewProvider.fetchNovelInfo(sourceId);
      this.logger.log(`成功獲取小說資訊，標題: ${novelInfo.novelTitle}`);

      // 建立或更新 Novel 實體
      const novel = await this.saveNovel(source, sourceId, novelInfo);
      this.logger.log(`已保存小說資訊至資料庫，ID: ${novel.id}`);

      // 構建預覽回應
      const previewResponse: PreviewNovelResponseDto = {
        novelId: novel.id,
        title: novel.title,
        author: novel.author || '',
        description: novel.description || '',
        source,
        sourceId,
        coverUrl: novel.coverUrl,
        novelUpdatedAt: novel.novelUpdatedAt,
      };

      this.logger.debug(`預覽回應數據: ${JSON.stringify(previewResponse)}`);

      // 更新任務狀態為完成，並緩存預覽數據
      await this.queueService.cacheJobStatus('preview', jobId, {
        jobId,
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        previewData: previewResponse, // 將預覽數據一併緩存
      });

      return previewResponse;
    } catch (error) {
      this.logger.error(`預覽任務處理失敗: ${error.message}`, error.stack);

      // 更新任務狀態為失敗
      await this.queueService.cacheJobStatus('preview', jobId, {
        jobId,
        status: JobStatus.FAILED,
        errorMessage: error.message,
        updatedAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * 保存小說信息到資料庫
   */
  private async saveNovel(
    source: NovelSource,
    sourceId: string,
    novelInfo: any,
  ): Promise<Novel> {
    // 檢查是否已存在相同來源和來源 ID 的小說
    const existingNovel = await (
      this.novelRepository as any
    ).findBySourceAndSourceId(source, sourceId);

    if (existingNovel) {
      // 更新現有小說
      existingNovel.update(
        novelInfo.novelTitle,
        novelInfo.novelAuthor,
        novelInfo.novelDescription || '',
        novelInfo.novelCoverUrl,
      );
      return await this.novelRepository.save(existingNovel);
    } else {
      // 創建新小說
      const novel = Novel.create(
        source,
        sourceId,
        novelInfo.novelTitle,
        novelInfo.novelAuthor,
        novelInfo.novelDescription || '',
        novelInfo.novelCoverUrl,
      );
      return await this.novelRepository.save(novel);
    }
  }
}

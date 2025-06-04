import { Inject, Injectable, Logger } from '@nestjs/common';
import { PREVIEW_PROVIDER_FACTORY_TOKEN } from '@/domain/ports/factory/preview-provider.factory.port.js';
import { PreviewProviderFactoryPort } from '@/domain/ports/factory/preview-provider.factory.port.js';
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
import { PreviewCacheService } from '../services/preview-cache.service.js';
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
    @Inject(PreviewCacheService)
    private readonly previewCacheService: PreviewCacheService,
  ) {}

  /**
   * 執行預覽任務處理
   * @param data 預覽任務數據
   */
  async execute(data: PreviewNovelJobData): Promise<PreviewNovelResponseDto> {
    const { jobId, source, sourceId } = data;
    this.logger.log(`處理預覽任務 (ID: ${jobId}): ${source}/${sourceId}`);

    // 🔑 添加任務級別的超時保護
    const TASK_TIMEOUT = 1 * 30 * 1000; // 30秒
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`預覽任務超時 (${TASK_TIMEOUT / 1000}秒): ${jobId}`));
      }, TASK_TIMEOUT);
    });

    try {
      // 更新任務狀態為處理中
      await this.queueService.cacheJobStatus('preview', jobId, {
        jobId,
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
      });

      // 🔑 使用 Promise.race 實現超時保護
      const result = await Promise.race([
        this.executePreviewTask(data),
        timeoutPromise,
      ]);

      return result;
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
   * 🔑 執行實際的預覽任務邏輯（從原 execute 方法提取）
   */
  private async executePreviewTask(
    data: PreviewNovelJobData,
  ): Promise<PreviewNovelResponseDto> {
    const { jobId, source, sourceId } = data;

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

    // 🆕 處理完成後設置 15 分鐘緩存
    try {
      await this.previewCacheService.setCachedPreview(source, sourceId, {
        novelId: novel.id,
        title: novel.title,
        author: novel.author || '',
        description: novel.description || '',
        source,
        sourceId,
      });
      this.logger.debug(`已設置預覽緩存: ${source}:${sourceId}`);
    } catch (cacheError) {
      // 緩存錯誤不應影響主流程
      this.logger.warn(`設置預覽緩存失敗: ${cacheError.message}`);
    }

    // 更新任務狀態為完成，並緩存預覽數據
    await this.queueService.cacheJobStatus('preview', jobId, {
      jobId,
      status: JobStatus.COMPLETED,
      completedAt: new Date(),
      previewData: previewResponse, // 將預覽數據一併緩存
      updatedAt: new Date(), // 確保更新時間
    });

    this.logger.log(
      `✅ 預覽任務完成 - jobId: ${jobId}, 狀態已更新為 COMPLETED`,
    );

    // 🆕 額外確認：再次檢查緩存狀態是否正確設置
    try {
      const cachedStatus = await this.queueService.getCachedJobStatus(
        'preview',
        jobId,
      );
      if (cachedStatus && cachedStatus.status === JobStatus.COMPLETED) {
        this.logger.debug(
          `✅ 緩存狀態確認成功 - jobId: ${jobId}, status: ${cachedStatus.status}`,
        );
      } else {
        this.logger.warn(
          `⚠️ 緩存狀態可能異常 - jobId: ${jobId}, cached: ${cachedStatus?.status || 'null'}`,
        );
      }
    } catch (cacheCheckError) {
      this.logger.warn(`緩存狀態檢查失敗: ${cacheCheckError.message}`);
    }

    return previewResponse;
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

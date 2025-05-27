import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { NovelRepositoryTypeORM } from '@/infrastructure/repositories/novel-repository.adapter.js';
import { NOVEL_REPOSITORY_TOKEN } from '@/infrastructure/repositories/repositories.module.js';
import { Novel } from '@/domain/entities/novel.entity.js';
import { PagedRepository } from '@/domain/ports/repository.port.js';
import {
  PREVIEW_PROVIDER_FACTORY_TOKEN,
  PreviewProviderFactoryPort,
} from '@/domain/ports/preview-provider.factory.port.js';

/**
 * 預覽小說 UseCase
 * 提取自原 NovelService.previewNovel 邏輯
 */
@Injectable()
export class PreviewNovelUseCase {
  private readonly logger = new Logger(PreviewNovelUseCase.name);

  constructor(
    @Inject(NOVEL_REPOSITORY_TOKEN)
    private readonly novelRepository: PagedRepository<Novel>,
    @Inject(PREVIEW_PROVIDER_FACTORY_TOKEN)
    private readonly previewProviderFactory: PreviewProviderFactoryPort,
  ) {}

  /**
   * 預覽小說資訊
   */
  async execute(source: NovelSource, sourceId: string): Promise<any> {
    try {
      this.logger.log(`獲取小說預覽，來源: ${source}, ID: ${sourceId}`);

      const previewProvider = this.previewProviderFactory.getProvider(source);
      const novelInfo = await previewProvider.fetchNovelInfo(sourceId);
      this.logger.log(`成功獲取小說資訊，標題: ${novelInfo.novelTitle}`);

      // 建立或更新 Novel 實體
      const novel = await this.saveNovel(source, sourceId, novelInfo);
      this.logger.log(`已保存小說資訊至資料庫，ID: ${novel.id}`);

      return {
        novelId: novel.id,
        title: novel.title,
        author: novel.author,
        description: novel.description,
        source,
        sourceId,
      };
    } catch (error) {
      this.logger.error(`預覽小說失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 將小說資訊儲存到資料庫
   */
  private async saveNovel(
    source: NovelSource,
    sourceId: string,
    novelInfo: any,
  ): Promise<Novel> {
    try {
      // 查找是否已存在相同 sourceId 的小說
      let novel = await this.findBySourceAndSourceId(source, sourceId);

      // 如果不存在，建立新實體
      if (!novel) {
        this.logger.debug(`創建新的小說記錄，sourceId: ${sourceId}`);
        novel = Novel.create(
          source,
          sourceId,
          novelInfo.novelTitle,
          novelInfo.novelAuthor || '未知作者',
          novelInfo.novelDescription || '',
        );
      } else {
        this.logger.debug(`更新現有小說記錄，id: ${novel.id}`);

        // 更新小說資訊
        novel.update(
          novelInfo.novelTitle,
          novelInfo.novelAuthor || '未知作者',
          novelInfo.novelDescription || '',
        );
      }

      // 儲存到資料庫
      return await this.novelRepository.save(novel);
    } catch (error) {
      this.logger.error(`保存小說資訊失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 根據來源和來源 ID 查找小說
   */
  private async findBySourceAndSourceId(
    source: NovelSource,
    sourceId: string,
  ): Promise<Novel | null> {
    try {
      // 使用自定義查詢方法查找小說
      const novelRepository = this.novelRepository as NovelRepositoryTypeORM;
      return await novelRepository.findBySourceAndSourceId(source, sourceId);
    } catch (error) {
      this.logger.error(`查找小說失敗: ${error.message}`, error.stack);
      return null;
    }
  }
}

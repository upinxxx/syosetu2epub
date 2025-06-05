import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import {
  NOVEL_REPOSITORY_TOKEN,
  PagedRepository,
} from '@/domain/ports/repository/index.js';
import { Novel } from '@/domain/entities/novel.entity.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { PreviewNovelResponseDto } from '../dto/preview-novel-response.dto.js';

/**
 * 根據小說 ID 獲取預覽 UseCase
 * 🔧 優化：直接返回數據庫中的數據，不重新獲取
 */
@Injectable()
export class GetNovelPreviewUseCase {
  private readonly logger = new Logger(GetNovelPreviewUseCase.name);

  constructor(
    @Inject(NOVEL_REPOSITORY_TOKEN)
    private readonly novelRepository: PagedRepository<Novel>,
  ) {}

  /**
   * 根據小說 ID 獲取預覽
   * @param id 小說 ID
   * @returns 小說預覽資訊
   */
  async execute(id: string): Promise<{
    success: boolean;
    preview: PreviewNovelResponseDto;
    message: string;
  }> {
    this.logger.log(`獲取小說 ID ${id} 的預覽`);

    try {
      // 查找小說
      const novel = await this.novelRepository.findById(id);

      if (!novel) {
        throw new NotFoundException(`找不到 ID 為 ${id} 的小說`);
      }

      // 🔧 直接構建預覽回應，不重新獲取數據
      const preview: PreviewNovelResponseDto = {
        novelId: novel.id,
        title: novel.title,
        author: novel.author || '',
        description: novel.description || '',
        source: novel.source as NovelSource,
        sourceId: novel.sourceId,
        coverUrl: novel.coverUrl,
        novelUpdatedAt: novel.novelUpdatedAt,
      };

      return {
        success: true,
        preview,
        message: `成功獲取小說 ${novel.title} 的預覽`,
      };
    } catch (error) {
      this.logger.error(`獲取預覽失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}

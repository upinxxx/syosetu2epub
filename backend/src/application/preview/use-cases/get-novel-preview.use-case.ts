import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import {
  NOVEL_REPOSITORY_TOKEN,
  PagedRepository,
} from '@/domain/ports/repository/index.js';
import { Novel } from '@/domain/entities/novel.entity.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { PreviewNovelUseCase } from './preview-novel.use-case.js';
import { PreviewNovelResponseDto } from '../dto/preview-novel-response.dto.js';

/**
 * 根據小說 ID 獲取預覽 UseCase
 */
@Injectable()
export class GetNovelPreviewUseCase {
  private readonly logger = new Logger(GetNovelPreviewUseCase.name);

  constructor(
    @Inject(NOVEL_REPOSITORY_TOKEN)
    private readonly novelRepository: PagedRepository<Novel>,
    @Inject(PreviewNovelUseCase)
    private readonly previewNovelUseCase: PreviewNovelUseCase,
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

      // 使用 PreviewNovelUseCase 獲取最新預覽
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
      throw error;
    }
  }
}

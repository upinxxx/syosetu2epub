import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { Novel } from '@/domain/entities/novel.entity.js';
import {
  NOVEL_REPOSITORY_TOKEN,
  EPUB_JOB_REPOSITORY_TOKEN,
} from '@/infrastructure/repositories/repositories.module.js';
import { Repository } from '@/domain/ports/repository.port.js';
import { QueuePort, QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';

/**
 * 提交 EPUB 轉換任務 UseCase
 * 提取自原 EpubJobService 中的入隊邏輯
 */
@Injectable()
export class SubmitJobUseCase {
  private readonly logger = new Logger(SubmitJobUseCase.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: Repository<EpubJob>,
    @Inject(NOVEL_REPOSITORY_TOKEN)
    private readonly novelRepository: Repository<Novel>,
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueService: QueuePort,
  ) {}

  /**
   * 建立和提交 EPUB 轉換任務
   */
  async execute(novelId: string): Promise<{ jobId: string }> {
    try {
      // 1. 檢查小說是否存在
      const novel = await this.novelRepository.findById(novelId);

      if (!novel) {
        throw new NotFoundException(`找不到 ID 為 ${novelId} 的小說`);
      }

      this.logger.log(`找到小說: ${novel.title}, ID: ${novel.id}`);

      // 2. 創建任務記錄
      const job = EpubJob.create(novelId);

      // 3. 保存任務到數據庫
      const savedJob = await this.epubJobRepository.save(job);
      this.logger.log(`已創建 EPUB 轉換任務: ${savedJob.id}`);

      // 4. 將任務加入隊列
      await this.queueService.addJob('epub', {
        jobId: savedJob.id,
        novelId: novel.id,
      });

      this.logger.log(`任務 ${savedJob.id} 已加入隊列`);

      return { jobId: savedJob.id };
    } catch (error) {
      this.logger.error(`創建 EPUB 任務失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}

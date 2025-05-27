import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { Novel } from '@/domain/entities/novel.entity.js';
import {
  EPUB_JOB_REPOSITORY_TOKEN,
  NOVEL_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
  Repository,
  UserRepository,
} from '@/domain/ports/repository/index.js';
import { QueuePort, QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';

/**
 * 提交 EPUB 轉換任務 UseCase
 * 提取自原 EpubJobService 中的入隊邏輯
 */
@Injectable()
export class SubmitEpubJobUseCase {
  private readonly logger = new Logger(SubmitEpubJobUseCase.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: Repository<EpubJob>,
    @Inject(NOVEL_REPOSITORY_TOKEN)
    private readonly novelRepository: Repository<Novel>,
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueService: QueuePort,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 建立和提交 EPUB 轉換任務
   * @param novelId 小說ID
   * @param userId 用戶ID（可為 null 或字符串，匿名用戶為 null）
   */
  async execute(
    novelId: string,
    userId: string | null,
  ): Promise<{ jobId: string }> {
    try {
      // 1. 檢查小說是否存在
      const novel = await this.novelRepository.findById(novelId);

      if (!novel) {
        throw new NotFoundException(`找不到 ID 為 ${novelId} 的小說`);
      }

      this.logger.log(`找到小說: ${novel.title}, ID: ${novel.id}`);

      // 2. 創建任務記錄
      let validUserId: string | null = null;

      // 檢查用戶是否存在
      if (userId !== null) {
        // 如果提供了用戶ID，需要驗證用戶是否存在
        this.logger.log(`檢查用戶 ${userId} 是否存在`);
        const userExists = await this.userRepository.findById(userId);

        if (userExists) {
          this.logger.log(`創建登入用戶 ${userId} 的轉換任務`);
          validUserId = userId;
        } else {
          this.logger.warn(`用戶 ${userId} 不存在，當作匿名處理`);
          validUserId = null;
        }
      } else {
        this.logger.log('創建匿名用戶的轉換任務');
      }

      // 創建 EPUB 任務實體
      const job = EpubJob.create(novelId, novel, validUserId);

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

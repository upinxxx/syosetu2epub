import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import {
  EpubJobRepository,
  EPUB_JOB_REPOSITORY_TOKEN,
  NovelRepository,
  NOVEL_REPOSITORY_TOKEN,
  UserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
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
    private readonly epubJobRepository: EpubJobRepository,
    @Inject(NOVEL_REPOSITORY_TOKEN)
    private readonly novelRepository: NovelRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepository,
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueService: QueuePort,
  ) {}

  /**
   * 建立和提交 EPUB 轉換任務
   * @param novelId 小說ID
   * @param userId 用戶ID（null 表示匿名用戶，string 表示已登入用戶）
   */
  async execute(
    novelId: string,
    userId: string | null,
  ): Promise<{ jobId: string }> {
    try {
      this.logger.log(
        `開始創建 EPUB 轉換任務 - 小說ID: ${novelId}, 用戶ID: ${userId || 'anonymous'}`,
      );

      // 1. 檢查小說是否存在
      const novel = await this.novelRepository.findById(novelId);
      if (!novel) {
        throw new NotFoundException(`找不到 ID 為 ${novelId} 的小說`);
      }
      this.logger.log(`找到小說: ${novel.title}, ID: ${novel.id}`);

      // 2. 驗證用戶身份（如果提供了用戶ID）
      const validatedUserId = await this.validateUser(userId);

      // 3. 創建任務記錄
      const job = EpubJob.create(novelId, novel, validatedUserId);
      this.logger.log(`創建 EPUB 任務實體: ${job.id}`);

      // 4. 保存任務到數據庫
      const savedJob = await this.epubJobRepository.save(job);
      this.logger.log(`已保存 EPUB 轉換任務到數據庫: ${savedJob.id}`);

      // 5. 將任務加入隊列
      await this.queueService.addJob('epub', {
        jobId: savedJob.id,
        novelId: novel.id,
        userId: validatedUserId,
      });
      this.logger.log(`任務 ${savedJob.id} 已加入處理隊列`);

      return { jobId: savedJob.id };
    } catch (error) {
      this.logger.error(
        `創建 EPUB 任務失敗 - 小說ID: ${novelId}, 用戶ID: ${userId || 'anonymous'}, 錯誤: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 驗證用戶身份
   * @param userId 用戶ID（null 表示匿名用戶）
   * @returns 驗證後的用戶ID（null 表示匿名用戶，string 表示有效的已登入用戶）
   */
  private async validateUser(userId: string | null): Promise<string | null> {
    this.logger.debug(`開始驗證用戶身份，輸入用戶ID: ${userId}`);

    // 匿名用戶直接返回 null
    if (userId === null) {
      this.logger.log('匿名用戶，跳過用戶驗證');
      return null;
    }

    // 檢查用戶ID格式
    if (typeof userId !== 'string') {
      this.logger.warn(
        `用戶ID類型錯誤: ${typeof userId}，期望 string，當作匿名用戶處理`,
      );
      return null;
    }

    if (userId.trim() === '') {
      this.logger.warn('用戶ID為空字符串，當作匿名用戶處理');
      return null;
    }

    const trimmedUserId = userId.trim();

    // 檢查用戶ID格式是否合理（基本的UUID格式檢查）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedUserId)) {
      this.logger.warn(
        `用戶ID格式不符合UUID標準: ${trimmedUserId}，當作匿名用戶處理`,
      );
      return null;
    }

    try {
      // 檢查用戶是否存在
      this.logger.debug(`檢查用戶 ${trimmedUserId} 是否存在於數據庫中`);
      const user = await this.userRepository.findById(trimmedUserId);

      if (user) {
        this.logger.log(
          `用戶 ${trimmedUserId} 驗證成功，用戶信息: ${user.email}`,
        );
        return trimmedUserId;
      } else {
        this.logger.warn(
          `用戶 ${trimmedUserId} 不存在於數據庫中，當作匿名用戶處理`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error(
        `用戶驗證過程中發生錯誤 - 用戶ID: ${trimmedUserId}`,
        error.stack,
      );

      // 記錄詳細的錯誤信息
      if (error instanceof Error) {
        this.logger.error(`錯誤詳情: ${error.message}`);
      }

      // 發生錯誤時當作匿名用戶處理，確保系統穩定性
      this.logger.warn(
        `由於驗證錯誤，將用戶 ${trimmedUserId} 當作匿名用戶處理`,
      );
      return null;
    }
  }
}

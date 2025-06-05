import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';
import { QueuePort } from '@/domain/ports/queue.port.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { PreviewNovelJobData } from '../../../shared/dto/preview-novel-job-data.dto.js';

/**
 * 添加預覽任務到佇列的用例
 */
@Injectable()
export class AddPreviewJobUseCase {
  private readonly logger = new Logger(AddPreviewJobUseCase.name);

  constructor(
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueService: QueuePort,
  ) {}

  /**
   * 執行添加預覽任務
   * @param source 小說來源
   * @param sourceId 小說來源 ID
   * @returns 任務 ID
   */
  async execute(source: NovelSource, sourceId: string): Promise<string> {
    this.logger.log(`添加預覽任務：${source}/${sourceId}`);

    try {
      // 生成任務 ID
      const jobId = randomUUID();

      // 構建任務數據
      const jobData: PreviewNovelJobData = {
        jobId,
        source,
        sourceId,
      };

      // 🔧 優化任務配置，提升處理速度
      const actualJobId = await this.queueService.addJob('preview', jobData, {
        removeOnComplete: 10, // 增加保留完成任務數量
        removeOnFail: 5, // 增加保留失敗任務數量
        attempts: 2, // 減少重試次數
        backoff: {
          type: 'exponential',
          delay: 500, // 減少重試延遲
        },
        // 🔧 添加任務優先級，預覽任務優先處理
        priority: 1,
      });

      this.logger.log(`預覽任務已添加到佇列：${actualJobId}`);
      return actualJobId;
    } catch (error) {
      this.logger.error(`添加預覽任務失敗：${error.message}`, error.stack);
      throw error;
    }
  }
}

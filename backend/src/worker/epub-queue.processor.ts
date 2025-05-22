// src/worker/queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProcessJobUseCase } from '../application/use-cases/process-job.use-case.js';
import { EpubJobData } from '@/application/dto/epub-job-data.dto.js';

/**
 * EPUB 隊列處理器
 * 接收 BullMQ 任務，並調用 ProcessJobUseCase 處理
 */
@Processor('epub')
export class EpubQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EpubQueueProcessor.name);

  constructor(
    @Inject(ProcessJobUseCase)
    private readonly processJobUseCase: ProcessJobUseCase,
  ) {
    super();
  }

  /**
   * 處理 EPUB 任務
   * @param job BullMQ 任務
   */
  async process(job: Job<EpubJobData>): Promise<void> {
    const jobData = job.data;

    this.logger.log(
      `收到 EPUB 轉換任務 (ID: ${job.id}): ${JSON.stringify(jobData)}`,
    );

    try {
      // 檢查必要的數據
      if (!jobData.jobId || !jobData.novelId) {
        throw new Error('缺少必要的任務數據：jobId 或 novelId');
      }

      // 執行任務處理
      await this.processJobUseCase.execute({
        jobId: jobData.jobId,
        novelId: jobData.novelId,
      });

      this.logger.log(`任務 ${job.id} 處理完成`);
    } catch (error) {
      this.logger.error(
        `任務 ${job.id} 處理失敗: ${error.message}`,
        error.stack,
      );
      throw error; // 重新拋出錯誤，讓 BullMQ 可以進行重試
    }
  }
}

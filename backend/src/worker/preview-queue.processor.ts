// src/worker/preview-queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PreviewNovelJobData } from '@/shared/dto/preview-novel-job-data.dto.js';
import { PreviewFacade } from '@/application/preview/preview.facade.js';

/**
 * 預覽隊列處理器
 * 接收 BullMQ 任務，並調用 Facade 處理
 */
@Processor('preview')
export class PreviewQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(PreviewQueueProcessor.name);

  constructor(private readonly previewFacade: PreviewFacade) {
    super();
  }

  /**
   * 處理預覽任務
   * @param job BullMQ 任務
   */
  async process(job: Job<PreviewNovelJobData>): Promise<void> {
    const jobData = job.data;

    this.logger.log(`收到預覽任務 (ID: ${job.id}): ${JSON.stringify(jobData)}`);

    try {
      // 檢查必要的數據
      if (!jobData.jobId || !jobData.source || !jobData.sourceId) {
        throw new Error('缺少必要的任務數據：jobId、source 或 sourceId');
      }

      // 執行任務處理
      await this.previewFacade.processJob(jobData);

      this.logger.log(`預覽任務 ${job.id} 處理完成`);
    } catch (error) {
      this.logger.error(
        `預覽任務 ${job.id} 處理失敗: ${error.message}`,
        error.stack,
      );
      throw error; // 重新拋出錯誤，讓 BullMQ 可以進行重試
    }
  }
}

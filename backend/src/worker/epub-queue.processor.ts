// src/worker/queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EpubJobData } from '@/shared/dto/epub-job-data.dto.js';
import { ConvertFacade } from '@/application/convert/convert.facade.js';

/**
 * EPUB 隊列處理器
 * 接收 BullMQ 任務，並調用 Facade 處理
 */
@Processor('epub')
export class EpubQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EpubQueueProcessor.name);

  constructor(
    @Inject(ConvertFacade)
    private readonly convertFacade: ConvertFacade,
  ) {
    super();
    // 啟動時檢查依賴注入
    this.logger.log(`ConvertFacade 注入狀態: ${!!this.convertFacade}`);
    if (this.convertFacade) {
      this.logger.log(
        `processJob 方法存在: ${typeof this.convertFacade.processJob === 'function'}`,
      );
    }
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

      // 檢查 convertFacade 是否已被正確注入
      if (!this.convertFacade) {
        throw new Error('ConvertFacade 未被正確注入');
      }

      // 檢查 processJob 方法是否存在
      if (typeof this.convertFacade.processJob !== 'function') {
        throw new Error('ConvertFacade.processJob 方法未定義');
      }

      // 執行任務處理
      this.logger.log(`開始處理任務 ${job.id}，調用 processJob 方法`);
      await this.convertFacade.processJob({
        jobId: jobData.jobId,
        novelId: jobData.novelId,
      });

      this.logger.log(`任務 ${job.id} 處理完成`);
    } catch (error) {
      this.logger.error(
        `任務 ${job.id} 處理失敗: ${error.message}`,
        error.stack,
      );

      // 更詳細的診斷信息
      if (!this.convertFacade) {
        this.logger.error('錯誤原因: ConvertFacade 未注入');
      } else if (typeof this.convertFacade.processJob !== 'function') {
        this.logger.error('錯誤原因: processJob 方法不存在');
        this.logger.error(
          `ConvertFacade 上的方法: ${Object.getOwnPropertyNames(Object.getPrototypeOf(this.convertFacade))}`,
        );
      }

      throw error; // 重新拋出錯誤，讓 BullMQ 可以進行重試
    }
  }
}

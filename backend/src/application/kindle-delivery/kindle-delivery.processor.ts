import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ProcessDeliveryJobUseCase } from './use-cases/process-delivery-job.use-case.js';

@Processor('kindle-delivery')
@Injectable()
export class KindleDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(KindleDeliveryProcessor.name);

  constructor(private readonly processDeliveryJob: ProcessDeliveryJobUseCase) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `處理 Kindle 交付任務: ${job.id}, 數據: ${JSON.stringify(job.data)}`,
    );

    try {
      const { deliveryId } = job.data;

      if (!deliveryId) {
        throw new Error('交付 ID 不能為空');
      }

      await this.processDeliveryJob.execute(deliveryId);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `處理 Kindle 交付任務失敗: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { SendToKindleUseCase } from './use-cases/send-to-kindle.use-case.js';
import { GetUserDeliveryHistoryUseCase } from './use-cases/get-user-delivery-history.use-case.js';
import { ProcessDeliveryJobUseCase } from './use-cases/process-delivery-job.use-case.js';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';

@Injectable()
export class KindleDeliveryFacade {
  constructor(
    private readonly sendToKindle: SendToKindleUseCase,
    private readonly getUserHistory: GetUserDeliveryHistoryUseCase,
    private readonly processDelivery: ProcessDeliveryJobUseCase,
  ) {}

  /**
   * 發送 EPUB 到 Kindle
   */
  sendToKindleEmail(
    epubJobId: string,
    userId: string,
    toEmail: string,
  ): Promise<KindleDelivery> {
    return this.sendToKindle.execute(epubJobId, userId, toEmail);
  }

  /**
   * 獲取用戶的 Kindle 交付歷史
   */
  getUserDeliveryHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    items: KindleDelivery[];
    totalItems: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    return this.getUserHistory.execute(userId, page, limit);
  }

  /**
   * 處理 Kindle 交付任務
   */
  processDeliveryJob(deliveryId: string): Promise<void> {
    return this.processDelivery.execute(deliveryId);
  }
}

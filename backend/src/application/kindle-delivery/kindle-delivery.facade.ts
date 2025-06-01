import { Inject, Injectable } from '@nestjs/common';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';
import { SendToKindleUseCase } from './send-to-kindle.use-case.js';
import { GetDeliveryHistoryQuery } from './get-delivery-history.query.js';
import { KindleDeliveryQueue } from '@/infrastructure/queue/kindle-delivery.queue.js';
import {
  KindleDeliveryRepository,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';

/**
 * KindleDeliveryFacade
 * 用於暴露給控制器和處理器的門面模式
 */
@Injectable()
export class KindleDeliveryFacade {
  constructor(
    private readonly sendToKindleUseCase: SendToKindleUseCase,
    private readonly getDeliveryHistoryQuery: GetDeliveryHistoryQuery,
    private readonly kindleDeliveryQueue: KindleDeliveryQueue,
    @Inject(KINDLE_DELIVERY_REPOSITORY_TOKEN)
    private readonly kindleDeliveryRepository: KindleDeliveryRepository,
  ) {}

  /**
   * 發送EPUB到Kindle
   * @param userId 用戶ID
   * @param epubJobId EPUB任務ID
   * @param kindleEmail Kindle郵箱地址
   */
  async sendToKindle(
    userId: string,
    epubJobId: string,
    kindleEmail: string,
  ): Promise<KindleDelivery> {
    return this.sendToKindleUseCase.execute(userId, epubJobId, kindleEmail);
  }

  /**
   * 將Kindle交付任務添加到隊列中
   * @param deliveryId 交付任務ID
   */
  async addDeliveryToQueue(deliveryId: string): Promise<void> {
    await this.kindleDeliveryQueue.addJob(deliveryId);
  }

  /**
   * 處理Kindle交付任務
   * @param deliveryId 交付任務ID
   */
  async processDeliveryJob(deliveryId: string): Promise<void> {
    return this.sendToKindleUseCase.processDelivery(deliveryId);
  }

  /**
   * 獲取特定的Kindle交付任務
   * @param userId 用戶ID
   * @param deliveryId 交付任務ID
   */
  async getDeliveryById(
    userId: string,
    deliveryId: string,
  ): Promise<KindleDelivery | null> {
    const delivery = await this.kindleDeliveryRepository.findById(deliveryId);

    // 如果找不到交付任務或者交付任務不屬於該用戶，則返回null
    if (!delivery || delivery.userId !== userId) {
      return null;
    }

    return delivery;
  }

  /**
   * 獲取用戶的Kindle交付歷史
   * @param userId 用戶ID
   * @param page 頁碼
   * @param limit 每頁數量
   */
  async getDeliveryHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.getDeliveryHistoryQuery.execute(userId, page, limit);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';
import { SendToKindleUseCase } from './use-cases/send-to-kindle.use-case.js';
import { GetDeliveryHistoryQuery } from './query/get-delivery-history.query.js';
import { GetDeliveryStatusQuery } from './query/get-delivery-status.query.js';
import { QUEUE_PORT_TOKEN, QueuePort } from '@/domain/ports/queue.port.js';
import {
  KindleDeliveryRepository,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';

/**
 * KindleDeliveryFacade
 * 用於暴露給控制器和處理器的門面模式
 * 重構後：僅負責 Use Case 協調，移除橫切關注點
 */
@Injectable()
export class KindleDeliveryFacade {
  constructor(
    @Inject(SendToKindleUseCase)
    private readonly sendToKindleUseCase: SendToKindleUseCase,
    @Inject(GetDeliveryHistoryQuery)
    private readonly getDeliveryHistoryQuery: GetDeliveryHistoryQuery,
    @Inject(GetDeliveryStatusQuery)
    private readonly getDeliveryStatusQuery: GetDeliveryStatusQuery,
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queuePort: QueuePort,
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
    // 創建交付記錄
    const delivery = await this.sendToKindleUseCase.execute(
      userId,
      epubJobId,
      kindleEmail,
    );

    try {
      // 立即將任務加入隊列進行處理
      await this.addDeliveryToQueue(delivery.id);
    } catch (error) {
      // 如果隊列加入失敗，將交付狀態標記為失敗
      delivery.markFailed(`隊列加入失敗: ${error.message || '未知錯誤'}`);
      await this.kindleDeliveryRepository.save(delivery);
      throw error;
    }

    return delivery;
  }

  /**
   * 將Kindle交付任務添加到隊列中
   * @param deliveryId 交付任務ID
   */
  async addDeliveryToQueue(deliveryId: string): Promise<void> {
    await this.queuePort.addJob('kindle-delivery', { deliveryId });
  }

  /**
   * 處理Kindle交付任務
   * @param deliveryId 交付任務ID
   */
  async processDeliveryJob(deliveryId: string): Promise<void> {
    return this.sendToKindleUseCase.processDelivery(deliveryId);
  }

  /**
   * 獲取交付歷史
   * @param userId 用戶ID
   * @param page 頁碼
   * @param limit 每頁數量
   */
  async getDeliveryHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: KindleDelivery[];
    currentPage: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  }> {
    return this.getDeliveryHistoryQuery.execute(userId, page, limit);
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
   * 獲取交付狀態
   * @param deliveryId 交付記錄ID
   * @param userId 用戶ID（用於權限驗證）
   * @returns 交付記錄
   */
  async getDeliveryStatus(
    deliveryId: string,
    userId: string,
  ): Promise<KindleDelivery> {
    return this.getDeliveryStatusQuery.execute(deliveryId, userId);
  }

  /**
   * 格式化發送響應
   * @param delivery Kindle交付實體
   * @returns 格式化的響應
   */
  formatSendResponse(delivery: KindleDelivery) {
    return {
      success: true,
      data: {
        id: delivery.id,
        status: delivery.status,
        epubJobId: delivery.epubJobId,
        toEmail: delivery.toEmail,
        createdAt: delivery.createdAt.toISOString(),
      },
      message: 'EPUB 已加入 Kindle 發送隊列',
    };
  }

  /**
   * 格式化狀態響應
   * @param delivery Kindle交付實體
   * @returns 格式化的響應
   */
  formatStatusResponse(delivery: KindleDelivery) {
    return {
      success: true,
      data: {
        id: delivery.id,
        status: delivery.status,
        epubJobId: delivery.epubJobId,
        toEmail: delivery.toEmail,
        errorMessage: delivery.errorMessage,
        sentAt: delivery.sentAt?.toISOString(),
        createdAt: delivery.createdAt.toISOString(),
      },
    };
  }

  /**
   * 獲取格式化的交付歷史
   * @param userId 用戶ID
   * @param page 頁碼
   * @param limit 每頁數量
   * @returns 格式化的交付歷史響應
   */
  async getFormattedDeliveryHistory(
    userId: string,
    page: number,
    limit: number,
  ) {
    const result = await this.getDeliveryHistory(userId, page, limit);

    return {
      success: true,
      data: {
        items: result.items.map((delivery) => ({
          id: delivery.id,
          epubJob: {
            id: delivery.epubJobId,
            novel: delivery.epubJob?.novel
              ? {
                  title: delivery.epubJob.novel.title,
                  author: delivery.epubJob.novel.author,
                }
              : undefined,
          },
          toEmail: delivery.toEmail,
          status: delivery.status,
          errorMessage: delivery.errorMessage,
          sentAt: delivery.sentAt?.toISOString(),
        })),
        meta: {
          page: result.currentPage,
          limit: result.limit,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
        },
      },
    };
  }
}

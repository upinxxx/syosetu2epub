import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';
import { SendToKindleUseCase } from './send-to-kindle.use-case.js';
import { GetDeliveryHistoryQuery } from './get-delivery-history.query.js';
import { GetDeliveryStatusQuery } from './get-delivery-status.query.js';
import { QUEUE_PORT_TOKEN, QueuePort } from '@/domain/ports/queue.port.js';
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
  private readonly logger = new Logger(KindleDeliveryFacade.name);

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
    this.logger.log(
      `Starting kindle delivery for user ${userId}, epub job ${epubJobId}`,
    );

    // 創建交付記錄
    const delivery = await this.sendToKindleUseCase.execute(
      userId,
      epubJobId,
      kindleEmail,
    );
    this.logger.log(`Created kindle delivery ${delivery.id}`);

    try {
      // 立即將任務加入隊列進行處理
      await this.addDeliveryToQueue(delivery.id);
      this.logger.log(`Added kindle delivery ${delivery.id} to queue`);
    } catch (error) {
      this.logger.error(
        `Failed to add kindle delivery ${delivery.id} to queue: ${error.message}`,
        error.stack,
      );
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
   * 獲取交付歷史（原始資料）
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
   * 獲取格式化的交付歷史（包含資料轉換）
   * @param userId 用戶ID
   * @param page 頁碼
   * @param limit 每頁數量
   */
  async getFormattedDeliveryHistory(
    userId: string,
    page: number,
    limit: number,
  ) {
    const result = await this.getDeliveryHistoryQuery.execute(
      userId,
      page,
      limit,
    );

    return {
      items: result.items.map((delivery) => this.formatDeliveryItem(delivery)),
      meta: {
        page: result.currentPage,
        limit: result.limit,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * 格式化單筆交付記錄
   * @param delivery 原始交付記錄
   * @returns 格式化後的交付記錄
   */
  private formatDeliveryItem(delivery: KindleDelivery) {
    return {
      id: delivery.id,
      epubJob: {
        id: delivery.epubJobId,
        novel: delivery.epubJob?.novel
          ? {
              title: delivery.epubJob.novel.title,
              author: delivery.epubJob.novel.author,
            }
          : null,
      },
      toEmail: delivery.toEmail,
      status: delivery.status,
      errorMessage: delivery.errorMessage,
      sentAt: delivery.sentAt,
    };
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
   * 格式化發送成功回應
   * @param delivery 交付記錄
   * @returns 標準化的成功回應
   */
  formatSendResponse(delivery: KindleDelivery) {
    return {
      success: true,
      data: {
        id: delivery.id,
        status: delivery.status,
        epubJobId: delivery.epubJobId,
        toEmail: delivery.toEmail,
        createdAt: delivery.createdAt,
      },
    };
  }

  /**
   * 格式化交付狀態回應
   * @param delivery 交付記錄
   * @returns 標準化的狀態回應
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
        sentAt: delivery.sentAt,
        createdAt: delivery.createdAt,
      },
    };
  }
}

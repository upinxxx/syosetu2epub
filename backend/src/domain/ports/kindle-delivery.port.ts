import { KindleDelivery } from '../entities/kindle-delivery.entity.js';

/**
 * Kindle 交付服務接口
 */
export interface KindleDeliveryPort {
  /**
   * 發送 EPUB 到 Kindle
   */
  sendToKindle(
    epubJobId: string,
    userId: string,
    toEmail: string,
  ): Promise<KindleDelivery>;

  /**
   * 獲取用戶的 Kindle 交付歷史
   */
  getUserDeliveryHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: KindleDelivery[];
    totalItems: number;
    totalPages: number;
    page: number;
    limit: number;
  }>;

  /**
   * 處理 Kindle 交付任務
   */
  processDeliveryJob(deliveryId: string): Promise<void>;
}

export const KINDLE_DELIVERY_PORT_TOKEN = 'KINDLE_DELIVERY_PORT';

import { KindleDelivery } from '../entities/kindle-delivery.entity.js';
import { Repository } from './repository.port.js';

/**
 * Kindle 交付儲存庫接口
 */
export interface KindleDeliveryRepository extends Repository<KindleDelivery> {
  /**
   * 根據 EPUB 任務 ID 查找 Kindle 交付
   */
  findByEpubJobId(epubJobId: string): Promise<KindleDelivery[]>;

  /**
   * 根據使用者 ID 查找 Kindle 交付
   */
  findByUserId(userId: string): Promise<KindleDelivery[]>;

  /**
   * 根據使用者 ID 分頁查詢 Kindle 交付
   */
  findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: KindleDelivery[];
    totalItems: number;
    totalPages: number;
  }>;
}

export const KINDLE_DELIVERY_REPOSITORY_TOKEN = 'KINDLE_DELIVERY_REPOSITORY';

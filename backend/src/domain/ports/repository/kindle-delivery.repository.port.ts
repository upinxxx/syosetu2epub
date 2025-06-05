import { KindleDelivery } from '../../entities/kindle-delivery.entity.js';
import { CrudRepository } from './base.repository.port.js';

/**
 * KindleDelivery Repository Port
 */
export interface KindleDeliveryRepository
  extends CrudRepository<KindleDelivery> {
  findByEpubJobId(epubJobId: string): Promise<KindleDelivery[]>;
  findByUserId(userId: string): Promise<KindleDelivery[]>;
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

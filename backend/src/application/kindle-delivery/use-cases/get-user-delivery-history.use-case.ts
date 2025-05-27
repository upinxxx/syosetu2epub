import { Inject, Injectable, Logger } from '@nestjs/common';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';
import {
  KindleDeliveryRepository,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';

/**
 * 獲取用戶的 Kindle 交付歷史用例
 */
@Injectable()
export class GetUserDeliveryHistoryUseCase {
  private readonly logger = new Logger(GetUserDeliveryHistoryUseCase.name);

  constructor(
    @Inject(KINDLE_DELIVERY_REPOSITORY_TOKEN)
    private readonly kindleDeliveryRepository: KindleDeliveryRepository,
  ) {}

  /**
   * 獲取用戶的 Kindle 交付歷史
   */
  async execute(
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
    const result = await this.kindleDeliveryRepository.findByUserIdPaginated(
      userId,
      page,
      limit,
    );

    return {
      ...result,
      page,
      limit,
    };
  }
}

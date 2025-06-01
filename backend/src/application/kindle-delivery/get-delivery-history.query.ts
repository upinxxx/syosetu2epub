import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  KindleDeliveryRepository,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
  UserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';

interface DeliveryHistoryResult {
  items: KindleDelivery[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

@Injectable()
export class GetDeliveryHistoryQuery {
  constructor(
    @Inject(KINDLE_DELIVERY_REPOSITORY_TOKEN)
    private readonly kindleDeliveryRepository: KindleDeliveryRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 獲取用戶的Kindle交付歷史
   * @param userId 用戶ID
   * @param page 頁碼，從1開始
   * @param limit 每頁數量
   */
  async execute(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<DeliveryHistoryResult> {
    // 1. 驗證用戶是否存在
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`用戶 ${userId} 不存在`);
    }

    // 2. 獲取用戶的Kindle交付歷史
    const { items, totalItems, totalPages } =
      await this.kindleDeliveryRepository.findByUserIdPaginated(
        userId,
        page,
        limit,
      );

    // 3. 返回結果
    return {
      items,
      totalItems,
      totalPages,
      currentPage: page,
      limit,
    };
  }
}

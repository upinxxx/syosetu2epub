import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  KindleDeliveryRepository,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';

@Injectable()
export class GetDeliveryStatusQuery {
  constructor(
    @Inject(KINDLE_DELIVERY_REPOSITORY_TOKEN)
    private readonly kindleDeliveryRepository: KindleDeliveryRepository,
  ) {}

  /**
   * 查詢特定交付記錄的狀態
   * @param deliveryId 交付記錄ID
   * @param userId 用戶ID（用於權限驗證）
   * @returns 交付記錄
   * @throws NotFoundException 如果記錄不存在
   * @throws ForbiddenException 如果用戶無權限查看
   */
  async execute(deliveryId: string, userId: string): Promise<KindleDelivery> {
    // 1. 查詢交付記錄
    const delivery = await this.kindleDeliveryRepository.findById(deliveryId);

    if (!delivery) {
      throw new NotFoundException(`交付記錄 ${deliveryId} 不存在`);
    }

    // 2. 驗證用戶權限（只能查詢自己的記錄）
    if (delivery.userId !== userId) {
      throw new ForbiddenException('您無權限查看此交付記錄');
    }

    return delivery;
  }
}

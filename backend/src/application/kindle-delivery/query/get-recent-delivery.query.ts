import { Injectable, Inject } from '@nestjs/common';
import {
  KindleDeliveryRepository,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';

@Injectable()
export class GetRecentDeliveryQuery {
  constructor(
    @Inject(KINDLE_DELIVERY_REPOSITORY_TOKEN)
    private readonly kindleDeliveryRepository: KindleDeliveryRepository,
  ) {}

  /**
   * 查詢指定用戶和EPUB任務的最近交付記錄
   * @param userId 用戶ID
   * @param epubJobId EPUB任務ID
   * @param withinSeconds 時間範圍（秒）
   * @returns 最近的交付記錄（如果存在）
   */
  async execute(
    userId: string,
    epubJobId: string,
    withinSeconds: number = 60,
  ): Promise<KindleDelivery | null> {
    // 計算截止時間
    const cutoffTime = new Date(Date.now() - withinSeconds * 1000);

    // 獲取該EPUB任務的所有交付記錄
    const deliveries =
      await this.kindleDeliveryRepository.findByEpubJobId(epubJobId);

    // 過濾出屬於該用戶且在時間範圍內的記錄
    const recentDeliveries = deliveries.filter(
      (delivery) =>
        delivery.userId === userId && delivery.createdAt > cutoffTime,
    );

    // 返回最近的一筆記錄（按創建時間排序）
    if (recentDeliveries.length > 0) {
      return recentDeliveries.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];
    }

    return null;
  }

  /**
   * 計算剩餘冷卻時間（秒）
   * @param lastDelivery 最近的交付記錄
   * @param cooldownSeconds 冷卻時間（秒）
   * @returns 剩餘冷卻時間，如果沒有冷卻則返回0
   */
  calculateRemainingCooldown(
    lastDelivery: KindleDelivery,
    cooldownSeconds: number = 60,
  ): number {
    const cooldownEndTime =
      lastDelivery.createdAt.getTime() + cooldownSeconds * 1000;
    const now = Date.now();

    if (now < cooldownEndTime) {
      return Math.ceil((cooldownEndTime - now) / 1000);
    }

    return 0;
  }
}

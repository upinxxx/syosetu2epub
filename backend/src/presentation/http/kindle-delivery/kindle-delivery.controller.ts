import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';

import { KindleDeliveryFacade } from '@/application/kindle-delivery/kindle-delivery.facade.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ZodPipe } from '../pipes/zod.pipe.js';

// 發送到Kindle的請求驗證schema
const SendToKindleSchema = z.object({
  epubJobId: z.string().uuid(),
  kindleEmail: z
    .string()
    .email()
    .endsWith('.com')
    .refine(
      (email) =>
        email.endsWith('@kindle.com') || email.endsWith('@kindle.amazon.com'),
      {
        message: '必須是有效的Kindle郵箱 (@kindle.com 或 @kindle.amazon.com)',
      },
    ),
});

// 分頁查詢參數驗證schema
const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

/**
 * Kindle交付控制器
 * 處理發送EPUB到Kindle和查詢交付歷史的HTTP請求
 */
@Controller('api/kindle')
@UseGuards(JwtAuthGuard) // 所有端點都需要身份驗證
export class KindleDeliveryController {
  constructor(private readonly kindleDeliveryFacade: KindleDeliveryFacade) {}

  /**
   * 發送EPUB到Kindle
   * POST /api/kindle/send
   */
  @Post('send')
  @UsePipes(new ZodPipe(SendToKindleSchema))
  async sendToKindle(
    @CurrentUser('id') userId: string,
    @Body() body: z.infer<typeof SendToKindleSchema>,
  ) {
    // 1. 創建交付記錄
    const delivery = await this.kindleDeliveryFacade.sendToKindle(
      userId,
      body.epubJobId,
      body.kindleEmail,
    );

    // 2. 添加到隊列
    await this.kindleDeliveryFacade.addDeliveryToQueue(delivery.id);

    // 3. 返回結果
    return {
      success: true,
      message: 'EPUB已加入Kindle交付隊列',
      data: {
        id: delivery.id,
        status: delivery.status,
      },
    };
  }

  /**
   * 獲取特定Kindle交付任務的狀態
   * GET /api/kindle/delivery-status/:deliveryId
   */
  @Get('delivery-status/:deliveryId')
  async getDeliveryStatus(
    @CurrentUser('id') userId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    // 檢查並獲取交付狀態
    const delivery = await this.kindleDeliveryFacade.getDeliveryById(
      userId,
      deliveryId,
    );

    if (!delivery) {
      throw new NotFoundException(`找不到指定的Kindle交付任務`);
    }

    return {
      success: true,
      data: {
        id: delivery.id,
        epubJobId: delivery.epubJobId,
        status: delivery.status,
        errorMessage: delivery.errorMessage,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
        sentAt: delivery.sentAt,
      },
    };
  }

  /**
   * 獲取Kindle交付歷史
   * GET /api/kindle/history
   */
  @Get('history')
  async getDeliveryHistory(
    @CurrentUser('id') userId: string,
    @Query(new ZodPipe(PaginationSchema))
    query: z.infer<typeof PaginationSchema>,
  ) {
    const { page, limit } = query;
    const result = await this.kindleDeliveryFacade.getDeliveryHistory(
      userId,
      page,
      limit,
    );

    return {
      success: true,
      data: {
        items: result.items.map((delivery) => ({
          id: delivery.id,
          epubJobId: delivery.epubJobId,
          epubTitle: delivery.epubJob?.title || '未知標題',
          kindleEmail: delivery.toEmail,
          status: delivery.status,
          errorMessage: delivery.errorMessage,
          createdAt: delivery.createdAt,
          updatedAt: delivery.updatedAt,
          sentAt: delivery.sentAt,
        })),
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: result.limit,
      },
    };
  }
}

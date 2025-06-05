import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { KindleDeliveryFacade } from '@/application/kindle-delivery/kindle-delivery.facade.js';

interface SendToKindleDto {
  jobId: string;
  kindleEmail: string;
}

/**
 * Kindle 交付 Controller
 * 處理與 Kindle 交付相關的 HTTP 請求
 * 遵循六角架構：僅依賴 KindleDeliveryFacade，無直接業務邏輯
 */
@Controller('kindle')
export class KindleDeliveryController {
  constructor(
    @Inject(KindleDeliveryFacade)
    private readonly kindleDeliveryFacade: KindleDeliveryFacade,
  ) {}

  /**
   * 發送到 Kindle
   * POST /api/v1/kindle/deliveries
   */
  @Post('deliveries')
  @UseGuards(AuthGuard('jwt'))
  async sendToKindle(@Body() dto: SendToKindleDto, @Request() req) {
    if (!dto.jobId) {
      throw new BadRequestException('EPUB 任務 ID 不能為空');
    }

    if (!dto.kindleEmail) {
      throw new BadRequestException('Kindle 電子郵件不能為空');
    }

    const userId = req.user.sub;

    const delivery = await this.kindleDeliveryFacade.sendToKindle(
      userId,
      dto.jobId,
      dto.kindleEmail,
    );

    return this.kindleDeliveryFacade.formatSendResponse(delivery);
  }

  /**
   * 獲取交付狀態
   * GET /api/v1/kindle/deliveries/:id
   */
  @Get('deliveries/:id')
  @UseGuards(AuthGuard('jwt'))
  async getDeliveryStatus(@Param('id') deliveryId: string, @Request() req) {
    const userId = req.user.sub;

    const delivery = await this.kindleDeliveryFacade.getDeliveryStatus(
      deliveryId,
      userId,
    );

    return this.kindleDeliveryFacade.formatStatusResponse(delivery);
  }

  /**
   * 獲取交付歷史
   * GET /api/v1/kindle/deliveries
   */
  @Get('deliveries')
  @UseGuards(AuthGuard('jwt'))
  async getDeliveryHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user.sub;

    return this.kindleDeliveryFacade.getFormattedDeliveryHistory(
      userId,
      page,
      limit,
    );
  }
}

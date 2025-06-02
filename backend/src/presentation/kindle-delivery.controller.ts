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

@Controller('api/kindle')
export class KindleDeliveryController {
  constructor(
    @Inject(KindleDeliveryFacade)
    private readonly kindleDeliveryFacade: KindleDeliveryFacade,
  ) {}

  @Post('send')
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

  @Get('delivery-status/:id')
  @UseGuards(AuthGuard('jwt'))
  async getDeliveryStatus(@Param('id') deliveryId: string, @Request() req) {
    const userId = req.user.sub;

    const delivery = await this.kindleDeliveryFacade.getDeliveryStatus(
      deliveryId,
      userId,
    );

    return this.kindleDeliveryFacade.formatStatusResponse(delivery);
  }

  @Get('history')
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

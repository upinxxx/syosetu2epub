import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { KindleDeliveryFacade } from '@/application/kindle-delivery/kindle-delivery.facade.js';

interface SendToKindleDto {
  jobId: string;
  kindleEmail: string;
}

@Controller('api/kindle')
export class KindleDeliveryController {
  constructor(private readonly kindleDeliveryFacade: KindleDeliveryFacade) {}

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

    const delivery = await this.kindleDeliveryFacade.sendToKindleEmail(
      dto.jobId,
      userId,
      dto.kindleEmail,
    );

    return {
      id: delivery.id,
      status: 'success',
      message: 'EPUB 檔案已成功寄送至您的 Kindle',
    };
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  async getDeliveryHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user.sub;

    const result = await this.kindleDeliveryFacade.getUserDeliveryHistory(
      userId,
      page,
      limit,
    );

    return {
      items: result.items.map((delivery) => ({
        id: delivery.id,
        epubJob: {
          id: delivery.epubJobId,
          novel: delivery.epubJob?.novel
            ? {
                title: delivery.epubJob.novel.title,
                author: delivery.epubJob.novel.author,
              }
            : null,
        },
        toEmail: delivery.toEmail,
        status: delivery.status,
        errorMessage: delivery.errorMessage,
        sentAt: delivery.sentAt,
      })),
      meta: {
        page: result.page,
        limit: result.limit,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      },
    };
  }
}

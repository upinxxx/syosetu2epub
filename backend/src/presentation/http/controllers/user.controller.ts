import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Inject,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserFacade } from '@/application/user/user.facade.js';
import { UpdateProfileDto } from '@/application/user/dto/update-profile.dto.js';
import { ConfigService } from '@nestjs/config';
import { ConvertFacade } from '@/application/convert/convert.facade.js';

/**
 * 用戶 Controller
 * 處理與用戶相關的 HTTP 請求
 * 遵循六角架構：僅依賴 Facade，無直接業務邏輯
 */
@Controller('users')
export class UserController {
  constructor(
    @Inject(UserFacade)
    private readonly userFacade: UserFacade,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(ConvertFacade)
    private readonly convertFacade: ConvertFacade,
  ) {}

  /**
   * 獲取用戶資料
   * GET /api/v1/users/profile
   */
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    const userId = req.user.sub;
    const user = await this.userFacade.getProfile(userId);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      kindleEmail: user.kindleEmail,
      dailyEmailQuota: user.dailyEmailQuota,
      createdAt: user.createdAt,
    };
  }

  /**
   * 更新用戶資料
   * PUT /api/v1/users/profile
   */
  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    const userId = req.user.sub;
    const updatedUser = await this.userFacade.updateProfile(userId, dto);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      kindleEmail: updatedUser.kindleEmail,
      updatedAt: new Date(),
    };
  }

  /**
   * 獲取發送郵箱
   * GET /api/v1/users/sender-email
   */
  @Get('sender-email')
  async getSenderEmail() {
    const resendConfig = this.configService.get('resend');
    const senderEmail =
      resendConfig?.fromEmail || 'noreply@kindle.syosetu2epub.online';

    return {
      senderEmail,
    };
  }

  /**
   * 獲取任務歷史
   * GET /api/v1/users/job-history
   */
  @Get('job-history')
  @UseGuards(AuthGuard('jwt'))
  async getJobHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user.sub;
    return this.convertFacade.getUserJobHistory(userId, page, limit);
  }

  /**
   * 獲取最近任務
   * GET /api/v1/users/recent-jobs
   */
  @Get('recent-jobs')
  @UseGuards(AuthGuard('jwt'))
  async getRecentJobs(@Request() req, @Query('days') days: number = 7) {
    const userId = req.user.sub;
    const jobs = await this.convertFacade.getUserRecentJobs(userId, days);

    return {
      success: true,
      jobs,
    };
  }
}

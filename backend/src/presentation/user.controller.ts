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
import { GetUserJobHistoryUseCase } from '@/application/convert/use-cases/get-user-job-history.use-case.js';

@Controller('api/user')
export class UserController {
  constructor(
    @Inject(UserFacade)
    private readonly userFacade: UserFacade,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(GetUserJobHistoryUseCase)
    private readonly getUserJobHistoryUseCase: GetUserJobHistoryUseCase,
  ) {}

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

  @Get('sender-email')
  async getSenderEmail() {
    const resendConfig = this.configService.get('resend');
    const senderEmail =
      resendConfig?.fromEmail || 'noreply@kindle.syosetu2epub.online';

    return {
      senderEmail,
    };
  }

  @Get('job-history')
  @UseGuards(AuthGuard('jwt'))
  async getJobHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user.sub;
    return this.getUserJobHistoryUseCase.execute(userId, page, limit);
  }

  @Get('recent-jobs')
  @UseGuards(AuthGuard('jwt'))
  async getRecentJobs(@Request() req, @Query('days') days: number = 7) {
    const userId = req.user.sub;
    const jobs = await this.getUserJobHistoryUseCase.getRecentJobs(
      userId,
      days,
    );

    return {
      success: true,
      jobs,
    };
  }
}

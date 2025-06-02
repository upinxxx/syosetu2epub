import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserFacade } from '@/application/user/user.facade.js';
import { UpdateProfileDto } from '@/application/user/dto/update-profile.dto.js';

@Controller('api/user')
export class UserController {
  constructor(
    @Inject(UserFacade)
    private readonly userFacade: UserFacade,
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
}

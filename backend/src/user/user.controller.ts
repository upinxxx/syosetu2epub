import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { AuthGuard } from '@nestjs/passport';
import {
  USER_REPOSITORY_TOKEN,
  UserRepository,
} from '@/domain/ports/repository/index.js';
import { User } from '@/domain/entities/user.entity.js';

class UpdateProfileDto {
  displayName?: string;
  kindleEmail?: string;
}

@Controller('api/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepository,
  ) {}

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    const userId = req.user.sub;
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('找不到使用者');
    }

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
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('找不到使用者');
    }

    if (dto.displayName) {
      // 這裡應該有更新顯示名稱的邏輯
      // 但目前 User 實體沒有提供這個方法
    }

    if (dto.kindleEmail !== undefined) {
      user.setKindleEmail(dto.kindleEmail || undefined);
    }

    const updatedUser = await this.userRepository.save(user);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      kindleEmail: updatedUser.kindleEmail,
      updatedAt: new Date(),
    };
  }
}

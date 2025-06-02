import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@/domain/entities/user.entity.js';
import {
  UserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';

/**
 * 獲取用戶資料用例
 */
@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 執行用例：獲取用戶資料
   * @param userId 用戶 ID
   * @returns 用戶實體
   */
  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('找不到使用者');
    }

    return user;
  }
}

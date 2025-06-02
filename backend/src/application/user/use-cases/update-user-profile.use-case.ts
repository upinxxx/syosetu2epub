import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@/domain/entities/user.entity.js';
import {
  UserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { UpdateProfileDto } from '../dto/update-profile.dto.js';

/**
 * 更新用戶資料用例
 */
@Injectable()
export class UpdateUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 執行用例：更新用戶資料
   * @param userId 用戶 ID
   * @param updates 更新資料
   * @returns 更新後的用戶實體
   */
  async execute(userId: string, updates: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('找不到使用者');
    }

    // 注意：基於目前的 User 實體設計，只有 kindleEmail 可以修改
    // displayName 在創建後似乎是不可變的

    // 更新 kindleEmail（如果提供）
    if (updates.kindleEmail !== undefined) {
      // 業務邏輯：Kindle Email 驗證由 User 實體內部處理
      user.setKindleEmail(updates.kindleEmail || undefined);
    }

    // 保存更新後的用戶
    const updatedUser = await this.userRepository.save(user);

    return updatedUser;
  }
}

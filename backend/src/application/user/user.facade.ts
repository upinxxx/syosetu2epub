import { Injectable, Inject } from '@nestjs/common';
import { User } from '@/domain/entities/user.entity.js';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case.js';
import { UpdateUserProfileUseCase } from './use-cases/update-user-profile.use-case.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

/**
 * 用戶管理門面
 * 統一處理用戶相關操作，隱藏內部 Use Case 的複雜性
 */
@Injectable()
export class UserFacade {
  constructor(
    @Inject(GetUserProfileUseCase)
    private readonly getUserProfile: GetUserProfileUseCase,
    @Inject(UpdateUserProfileUseCase)
    private readonly updateUserProfile: UpdateUserProfileUseCase,
  ) {}

  /**
   * 獲取用戶資料
   * @param userId 用戶 ID
   * @returns 用戶實體
   */
  async getProfile(userId: string): Promise<User> {
    return this.getUserProfile.execute(userId);
  }

  /**
   * 更新用戶資料
   * @param userId 用戶 ID
   * @param updates 更新資料 DTO
   * @returns 更新後的用戶實體
   */
  async updateProfile(
    userId: string,
    updates: UpdateProfileDto,
  ): Promise<User> {
    return this.updateUserProfile.execute(userId, updates);
  }
}

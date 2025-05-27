import { Inject, Injectable } from '@nestjs/common';
import { User } from '@/domain/entities/user.entity.js';
import {
  USER_AUTH_PORT_TOKEN,
  UserAuthPort,
} from '@/domain/ports/auth.port.js';

/**
 * 獲取當前用戶用例
 */
@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_AUTH_PORT_TOKEN)
    private readonly userAuthPort: UserAuthPort,
  ) {}

  /**
   * 執行用例：獲取當前用戶
   */
  async execute(userId: string): Promise<User> {
    return this.userAuthPort.getCurrentUser(userId);
  }
}

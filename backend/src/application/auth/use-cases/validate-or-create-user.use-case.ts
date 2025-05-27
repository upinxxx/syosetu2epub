import { Inject, Injectable } from '@nestjs/common';
import { User } from '@/domain/entities/user.entity.js';
import {
  GoogleProfile,
  USER_AUTH_PORT_TOKEN,
  UserAuthPort,
} from '@/domain/ports/auth.port.js';

/**
 * 驗證或創建使用者用例
 */
@Injectable()
export class ValidateOrCreateUserUseCase {
  constructor(
    @Inject(USER_AUTH_PORT_TOKEN)
    private readonly userAuthPort: UserAuthPort,
  ) {}

  /**
   * 執行用例：驗證或創建使用者
   */
  async execute(profile: GoogleProfile): Promise<User> {
    return this.userAuthPort.validateOrCreateUser(profile);
  }
}

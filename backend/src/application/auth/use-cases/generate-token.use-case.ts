import { Inject, Injectable } from '@nestjs/common';
import { User } from '@/domain/entities/user.entity.js';
import {
  USER_AUTH_PORT_TOKEN,
  UserAuthPort,
} from '@/domain/ports/auth.port.js';

/**
 * 生成身份驗證令牌用例
 */
@Injectable()
export class GenerateTokenUseCase {
  constructor(
    @Inject(USER_AUTH_PORT_TOKEN)
    private readonly userAuthPort: UserAuthPort,
  ) {}

  /**
   * 執行用例：生成身份驗證令牌
   */
  execute(user: User): string {
    return this.userAuthPort.generateToken(user);
  }
}

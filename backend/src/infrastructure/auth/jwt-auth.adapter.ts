import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserAuthPort, GoogleProfile } from '@/domain/ports/auth.port.js';
import { User } from '@/domain/entities/user.entity.js';
import {
  PagedUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { ConfigService } from '@nestjs/config';

/**
 * JWT 認證適配器
 * 實現領域層定義的 UserAuthPort 入站埠接口
 */
@Injectable()
export class JwtAuthAdapter implements UserAuthPort {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: PagedUserRepository,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  /**
   * 驗證或創建用戶
   */
  async validateOrCreateUser(profile: GoogleProfile): Promise<User> {
    // 根據 Google ID 查找用戶
    const userByGoogleId = await this.userRepository.findByGoogleId(profile.id);

    // 如果找到用戶，則返回
    if (userByGoogleId) {
      // 記錄登入
      userByGoogleId.recordLogin();
      // 保存更新後的領域實體到資料庫
      await this.userRepository.save(userByGoogleId);
      return userByGoogleId;
    }

    // 如果沒有找到用 Google ID，則通過 Email 查找
    const userByEmail = await this.userRepository.findByEmail(profile.email);

    if (userByEmail) {
      // 記錄登入
      userByEmail.recordLogin();
      // 保存更新後的領域實體到資料庫
      await this.userRepository.save(userByEmail);
      return userByEmail;
    }

    // 如果用戶不存在，創建新用戶
    const newUser = User.create(profile.id, profile.email, profile.displayName);

    // 記錄登入
    newUser.recordLogin();

    // 保存新用戶
    await this.userRepository.save(newUser);

    return newUser;
  }

  /**
   * 獲取當前用戶
   */
  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * 生成 JWT 令牌
   */
  generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.sign(payload);
  }
}

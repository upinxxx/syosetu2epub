import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { GenerateTokenUseCase } from './use-cases/generate-token.use-case.js';
import { GetCurrentUserUseCase } from './use-cases/get-current-user.use-case.js';
import { ValidateOrCreateUserUseCase } from './use-cases/validate-or-create-user.use-case.js';
import { GoogleProfile } from '@/domain/ports/auth.port.js';
import { User } from '@/domain/entities/user.entity.js';

/**
 * Cookie 配置介面
 */
export interface CookieConfig {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}

/**
 * 認證回應介面
 */
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    kindleEmail?: string;
  };
  cookieConfig: CookieConfig;
}

@Injectable()
export class AuthFacade {
  constructor(
    @Inject(GenerateTokenUseCase)
    private readonly generateToken: GenerateTokenUseCase,
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUser: GetCurrentUserUseCase,
    @Inject(ValidateOrCreateUserUseCase)
    private readonly validateOrCreate: ValidateOrCreateUserUseCase,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  login(user: any) {
    return this.generateToken.execute(user);
  }

  me(id: string) {
    return this.getCurrentUser.execute(id);
  }

  upsertGoogle(profile: GoogleProfile) {
    return this.validateOrCreate.execute(profile);
  }

  /**
   * 創建認證回應，包含 Token 生成和 Cookie 設定
   * @param user 用戶實體
   * @param res Express Response 對象
   * @returns 包含 token、user 和 cookie 配置的回應物件
   */
  createAuthResponse(user: User, res: Response): AuthResponse {
    const token = this.generateToken.execute(user);
    const cookieConfig = this.getCookieConfig();

    // 實際設置 Cookie
    res.cookie('auth_token', token, cookieConfig);

    // 設置一個可見的登入狀態 Cookie 供前端檢查
    res.cookie('is_logged_in', 'true', {
      ...cookieConfig,
      httpOnly: false, // 讓前端可以讀取
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        kindleEmail: user.kindleEmail,
      },
      cookieConfig,
    };
  }

  /**
   * 清除認證回應，包含 Cookie 清除
   * @param res Express Response 對象
   * @returns 包含成功標識的回應物件
   */
  clearAuthResponse(res: Response): { success: boolean } {
    const cookieConfig = this.getCookieConfig();

    // 清除認證相關的 Cookie
    res.clearCookie('auth_token', cookieConfig);
    res.clearCookie('is_logged_in', {
      ...cookieConfig,
      httpOnly: false,
    });

    return { success: true };
  }

  /**
   * 創建登出回應，包含 Cookie 清除配置
   * @returns 包含成功標識和 cookie 清除配置的回應物件
   */
  createLogoutResponse(): { success: boolean; cookieConfig: CookieConfig } {
    return {
      success: true,
      cookieConfig: this.getCookieConfig(),
    };
  }

  /**
   * 獲取 Cookie 配置
   * @returns Cookie 配置物件
   */
  getCookieConfig(): CookieConfig {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const cookieConfig: CookieConfig = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // 生產環境跨域需要使用 'none'
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
      path: '/',
    };

    // 生產環境設置正確的 domain
    if (isProduction) {
      // 設置為根域名，讓子域名都能使用這個 Cookie
      cookieConfig.domain = '.syosetu2epub.online';
    }

    return cookieConfig;
  }
}

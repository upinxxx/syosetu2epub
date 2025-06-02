import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { GenerateTokenUseCase } from './use-cases/generate-token.use-case.js';
import { GetCurrentUserUseCase } from './use-cases/get-current-user.use-case.js';
import { ValidateOrCreateUserUseCase } from './use-cases/validate-or-create-user.use-case.js';
import { GoogleProfile } from '@/domain/ports/auth.port.js';
import { User } from '@/domain/entities/user.entity.js';

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
   * @param res Express Response 物件
   * @returns 包含 token 和 user 的回應物件
   */
  createAuthResponse(user: User, res: Response) {
    const token = this.generateToken.execute(user);
    this.setCookies(res, token);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        kindleEmail: user.kindleEmail,
      },
    };
  }

  /**
   * 清除認證回應，包含 Cookie 清除
   * @param res Express Response 物件
   * @returns 成功回應物件
   */
  clearAuthResponse(res: Response) {
    this.clearCookies(res);
    return { success: true };
  }

  /**
   * 設置認證 Cookie
   * @param res Express Response 物件
   * @param token JWT Token
   */
  private setCookies(res: Response, token: string): void {
    // 開發環境下不指定 domain，使用瀏覽器默認值
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    // 獲取前端使用的協議 (開發環境通常是 http，生產環境是 https)
    const protocol = isProduction ? 'https' : 'http';

    // 開發環境下，前端通過 Vite 代理與後端通信，所以實際上是同源請求
    // 此時 cookie 應該使用 SameSite=Lax 或 Strict，而不是 None
    // 同時，由於是 http，不應該設置 secure
    const cookieOptions: any = {
      httpOnly: true,
      secure: isProduction, // 生產環境使用 HTTPS，所以 secure 為 true
      sameSite: 'lax', // 大多數情況下 'lax' 就足夠了
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
      path: '/',
    };

    // 只有在生產環境才設置 domain
    if (isProduction) {
      cookieOptions.domain = this.configService.get<string>('COOKIE_DOMAIN');
    }

    res.cookie('auth_token', token, cookieOptions);

    // 設置一個非 httpOnly 的 cookie，以便前端檢測登入狀態
    res.cookie('is_logged_in', 'true', {
      ...cookieOptions,
      httpOnly: false,
    });
  }

  /**
   * 清除認證 Cookie
   * @param res Express Response 物件
   */
  private clearCookies(res: Response): void {
    // 開發環境下不指定 domain，使用瀏覽器默認值
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const cookieOptions: any = {
      httpOnly: true,
      secure: isProduction, // 生產環境使用 HTTPS，所以 secure 為 true
      sameSite: 'lax', // 大多數情況下 'lax' 就足夠了
      path: '/',
    };

    // 只有在生產環境才設置 domain
    if (isProduction) {
      cookieOptions.domain = this.configService.get<string>('COOKIE_DOMAIN');
    }

    res.clearCookie('auth_token', cookieOptions);
    res.clearCookie('is_logged_in', {
      ...cookieOptions,
      httpOnly: false,
    });
  }
}

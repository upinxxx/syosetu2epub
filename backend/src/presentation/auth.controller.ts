import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Inject,
  HttpStatus,
  Redirect,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { GoogleProfile } from '../domain/ports/auth.port.js';
import { AuthFacade } from '@/application/auth/auth.facade.js';

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(AuthFacade) private readonly authFacade: AuthFacade,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    this.logger.log('接收到 Google OAuth 登入請求');
    // Google 會重導到 callback URL，所以這個方法不需要任何邏輯
    return;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @Redirect()
  async googleAuthCallback(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      this.logger.log('收到 Google OAuth 回調');

      // req.user 是 GoogleStrategy validate 方法回傳的 GoogleProfile
      const googleProfile: GoogleProfile = req.user;
      this.logger.debug(
        `用戶資料: ${JSON.stringify({
          id: googleProfile.id,
          email: googleProfile.email,
          displayName: googleProfile.displayName,
        })}`,
      );

      // 使用 Facade 驗證或創建用戶
      const user = await this.authFacade.upsertGoogle(googleProfile);
      this.logger.debug(`用戶 ${user.id} 驗證/創建成功`);

      // 生成 JWT token
      const token = this.authFacade.login(user);
      this.logger.debug('JWT token 生成成功');

      // 設置 HTTP-Only cookie
      this.setAuthCookie(res, token);

      // 重定向到前端的 OAuth 成功頁面
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      this.logger.log(`重定向到: ${frontendUrl}/oauth/success`);
      return { url: `${frontendUrl}/oauth/success` };
    } catch (error) {
      this.logger.error('OAuth 回調處理失敗', error.stack);
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      return { url: `${frontendUrl}/oauth/error` };
    }
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  async getAuthStatus(@Req() req: any) {
    try {
      this.logger.log('檢查認證狀態');
      // req.user 是由 JwtStrategy 提供的當前登入用戶
      const userId = req.user.sub;
      this.logger.debug(`當前用戶 ID: ${userId}`);

      // 獲取完整的用戶資訊
      const user = await this.authFacade.me(userId);
      this.logger.debug(`成功取得用戶資料: ${user.email}`);

      return {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      };
    } catch (error) {
      this.logger.error('認證狀態檢查失敗', error.stack);
      throw new UnauthorizedException('用戶未驗證或會話已過期');
    }
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.logger.log('處理登出請求');
    this.clearAuthCookie(res);
    this.logger.debug('已清除認證 Cookie');
    return { success: true };
  }

  // 私有方法：設置認證 cookie
  private setAuthCookie(res: Response, token: string): void {
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

    this.logger.debug(
      `設置認證 Cookie，選項: ${JSON.stringify(cookieOptions)}`,
    );
    res.cookie('auth_token', token, cookieOptions);

    // 設置一個非 httpOnly 的 cookie，以便前端檢測登入狀態
    res.cookie('is_logged_in', 'true', {
      ...cookieOptions,
      httpOnly: false,
    });
  }

  // 私有方法：清除認證 cookie
  private clearAuthCookie(res: Response): void {
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

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
import { GoogleProfile } from '../../../domain/ports/auth.port.js';
import { AuthFacade } from '@/application/auth/auth.facade.js';

/**
 * 認證 Controller
 * 處理與用戶認證相關的 HTTP 請求
 * 遵循六角架構：僅依賴 AuthFacade，無直接業務邏輯
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(AuthFacade) private readonly authFacade: AuthFacade,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  /**
   * Google OAuth 登入
   * GET /api/v1/auth/google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    this.logger.log('接收到 Google OAuth 登入請求');
    // Google 會重導到 callback URL，所以這個方法不需要任何邏輯
    return;
  }

  /**
   * Google OAuth 回調
   * GET /api/v1/auth/google/callback
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
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

      // 使用 Facade 創建認證回應（包含 Token 生成和 Cookie 設定）
      const authResponse = this.authFacade.createAuthResponse(user, res);
      this.logger.debug('JWT token 生成成功');

      // 重定向到前端的 OAuth 成功頁面
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/oauth/success`;

      this.logger.log(`重定向到: ${redirectUrl}`);

      // 使用手動重定向，確保更好的控制
      res.redirect(302, redirectUrl);
    } catch (error) {
      this.logger.error('OAuth 回調處理失敗', error.stack);
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      const errorUrl = `${frontendUrl}/oauth/error`;

      this.logger.log(`重定向到錯誤頁面: ${errorUrl}`);
      res.redirect(302, errorUrl);
    }
  }

  /**
   * 獲取當前用戶資訊
   * GET /api/v1/auth/me
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getCurrentUser(@Req() req: any) {
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
          kindleEmail: user.kindleEmail,
        },
      };
    } catch (error) {
      this.logger.error('認證狀態檢查失敗', error.stack);
      throw new UnauthorizedException('用戶未驗證或會話已過期');
    }
  }

  /**
   * 用戶登出
   * POST /api/v1/auth/logout
   */
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.logger.log('處理登出請求');
    const result = this.authFacade.clearAuthResponse(res);
    this.logger.debug('已清除認證 Cookie');
    return result;
  }
}

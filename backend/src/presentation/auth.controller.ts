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

      // 使用 Facade 創建認證回應（包含 Token 生成和 Cookie 設定）
      const authResponse = this.authFacade.createAuthResponse(user, res);
      this.logger.debug('JWT token 生成成功');

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
          kindleEmail: user.kindleEmail,
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
    const result = this.authFacade.clearAuthResponse(res);
    this.logger.debug('已清除認證 Cookie');
    return result;
  }
}

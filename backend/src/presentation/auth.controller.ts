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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { GoogleProfile } from '../domain/ports/auth.port.js';
import { AuthFacade } from '@/application/auth/auth.facade.js';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authFacade: AuthFacade,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
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
      // req.user 是 GoogleStrategy validate 方法回傳的 GoogleProfile
      const googleProfile: GoogleProfile = req.user;

      // 使用 Facade 驗證或創建用戶
      const user = await this.authFacade.upsertGoogle(googleProfile);

      // 生成 JWT token
      const token = this.authFacade.login(user);

      // 設置 HTTP-Only cookie
      this.setAuthCookie(res, token);

      // 重定向到前端的 OAuth 成功頁面
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      return { url: `${frontendUrl}/oauth/success` };
    } catch (error) {
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
      // req.user 是由 JwtStrategy 提供的當前登入用戶
      const userId = req.user.sub;

      // 獲取完整的用戶資訊
      const user = await this.authFacade.me(userId);

      return {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('用戶未驗證或會話已過期');
    }
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookie(res);
    return { success: true };
  }

  // 私有方法：設置認證 cookie
  private setAuthCookie(res: Response, token: string): void {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
      path: '/',
    });
  }

  // 私有方法：清除認證 cookie
  private clearAuthCookie(res: Response): void {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }
}

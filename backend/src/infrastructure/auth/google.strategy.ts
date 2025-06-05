import { Inject, Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { GoogleProfile } from '../../domain/ports/auth.port.js';

/**
 * Google 登入策略 - Passport 實作
 *
 * 基礎設施層負責處理外部框架整合細節
 * 這個類別負責 Passport + Google OAuth2 的整合，將結果轉換為領域定義的資料結構
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const clientId = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new Error(
        'Google OAuth configuration not found in environment variables',
      );
    }

    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: callbackUrl,
      scope: ['email', 'profile'],
    });

    this.logger.debug(`初始化 Google OAuth 策略`);
    this.logger.debug(`回調 URL: ${callbackUrl}`);
  }

  /**
   * Passport 框架的驗證回調處理
   * @returns 經過轉換的 GoogleProfile 領域對象
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<GoogleProfile> {
    this.logger.debug(`Google OAuth 回調驗證成功，用戶 ID: ${profile.id}`);

    // 將 Passport 資料結構轉換為領域層的 GoogleProfile，供應用層使用
    return {
      id: profile.id,
      email: profile.emails?.[0].value!,
      displayName: profile.displayName,
      avatar: profile.photos?.[0].value,
    };
  }
}

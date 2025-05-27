import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-google-oauth20';
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
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const options: StrategyOptions = {
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,
      scope: ['email', 'profile'],
    };

    super(options);
  }

  /**
   * Passport 框架的驗證回調處理
   * @returns 經過轉換的 GoogleProfile 領域對象
   */
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<GoogleProfile> {
    // 將 Passport 資料結構轉換為領域層的 GoogleProfile，供應用層使用
    return {
      id: profile.id,
      email: profile.emails?.[0].value!,
      displayName: profile.displayName,
      avatar: profile.photos?.[0].value,
    };
  }
}

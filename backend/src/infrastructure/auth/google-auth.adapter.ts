import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import {
  ExternalAuthProvider,
  GoogleProfile,
} from '../../domain/ports/auth.port.js';

/**
 * Google 認證適配器
 * 實現領域層定義的外部認證提供者介面
 */
@Injectable()
export class GoogleAuthAdapter implements ExternalAuthProvider {
  private readonly logger = new Logger(GoogleAuthAdapter.name);
  private readonly oauth2Client: OAuth2Client;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error(
        'Google OAuth configuration not found in environment variables',
      );
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret);
  }

  /**
   * 實現 ExternalAuthProvider 接口的認證方法
   * @param credentials 谷歌認證憑證，包含訪問令牌
   * @returns 谷歌用戶資料
   */
  async authenticate(credentials: {
    accessToken: string;
  }): Promise<GoogleProfile> {
    try {
      // 設置憑證
      this.oauth2Client.setCredentials({
        access_token: credentials.accessToken,
      });

      // 使用 Google API 獲取用戶資料
      const { data } = await this.oauth2Client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      });

      // 為API返回的資料添加明確的類型
      const userInfo = data as {
        sub: string;
        email: string;
        name: string;
        picture?: string;
      };

      // 將 Google API 返回的資料轉換為領域模型所需的格式
      return {
        id: userInfo.sub,
        email: userInfo.email,
        displayName: userInfo.name,
        avatar: userInfo.picture,
      };
    } catch (error) {
      throw new Error(`Google authentication failed: ${error.message}`);
    }
  }
}

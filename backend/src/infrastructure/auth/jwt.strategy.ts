import { Inject, Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * JWT 身份驗證策略 - 基礎設施層
 *
 * 負責從 HTTP 請求中提取 JWT 並驗證其有效性
 * 符合六角形架構，作為外部框架的適配器，不依賴應用層
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 嘗試從 cookie 中提取 token
        (req: Request) => {
          this.logger.debug(
            `Cookies in request: ${JSON.stringify(req.cookies)}`,
          );
          const token = req?.cookies?.auth_token;
          if (!token) {
            this.logger.debug('No auth_token cookie found in request');
            return null;
          }
          this.logger.debug('Found auth_token cookie in request');
          return token;
        },
        // 備用: 從 Authorization 頭部提取
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true, // 將完整的請求對象傳遞給 validate 方法
    });
  }

  /**
   * JWT 驗證通過後的處理
   * @param req 完整的請求對象
   * @param payload JWT 解碼後的內容
   * @returns 傳遞給下一個中間件的用戶資訊
   */
  async validate(req: Request, payload: any) {
    this.logger.debug(`JWT payload: ${JSON.stringify(payload)}`);

    // 直接返回 payload，便於 controllers 使用
    // controllers 將調用應用層服務獲取完整用戶資料
    return {
      sub: payload.sub,
      email: payload.email,
    };
  }
}

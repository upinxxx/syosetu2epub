import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
      throw new Error('JWT_SECRET not found in environment variables');
    }

    super({
      // 支援多種 JWT 提取方式：
      // 1. Authorization header (Bearer token)
      // 2. Cookie (auth_token)
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          // 從 Cookie 中提取 JWT
          const token = request?.cookies?.auth_token;
          if (token) {
            this.logger.debug('從 Cookie 中提取到 JWT token');
            return token;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      issuer: configService.get<string>('JWT_ISSUER'),
      audience: configService.get<string>('JWT_AUDIENCE'),
      // 傳遞完整的請求對象到 validate 方法
      passReqToCallback: true,
    });
  }

  /**
   * JWT 驗證通過後的處理
   * @param req 完整的請求對象
   * @param payload JWT 解碼後的內容
   * @returns 傳遞給下一個中間件的用戶資訊
   */
  async validate(req: Request, payload: any) {
    this.logger.debug(`JWT 驗證成功，payload: ${JSON.stringify(payload)}`);
    this.logger.debug(`請求路徑: ${req.path}, 方法: ${req.method}`);

    // 驗證 payload 必要欄位
    if (!payload.sub || !payload.email) {
      this.logger.warn('JWT payload 缺少必要欄位 (sub 或 email)');
      throw new UnauthorizedException('Invalid token payload');
    }

    // 直接返回 payload，便於 controllers 使用
    // controllers 將調用應用層服務獲取完整用戶資料
    return {
      sub: payload.sub,
      email: payload.email,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';

/**
 * 匿名認證策略 - Passport 實作
 *
 * 用於處理未登入用戶的認證流程
 * 確保匿名用戶能夠使用需要身份驗證但允許匿名的功能
 */
@Injectable()
export class AnonymousStrategy extends PassportStrategy(Strategy, 'anonymous') {
  private readonly logger = new Logger(AnonymousStrategy.name);

  constructor() {
    super();
  }

  /**
   * 匿名認證邏輯
   * 返回 null 確保 req.user 為 null，便於 ConvertFacade 統一處理
   */
  async validate(req: any): Promise<null> {
    // 記錄匿名認證的詳細信息
    this.logger.debug('匿名認證策略被調用');
    this.logger.debug(`請求路徑: ${req?.path || 'unknown'}`);
    this.logger.debug(`請求方法: ${req?.method || 'unknown'}`);

    // 檢查是否有認證頭部或 Cookie，這可能表示 JWT 策略失敗了
    const authHeader = req?.headers?.authorization;
    const authCookie = req?.cookies?.auth_token;

    if (authHeader || authCookie) {
      this.logger.warn(
        '檢測到認證信息但使用匿名策略，可能是 JWT 驗證失敗。' +
          `Authorization 頭部: ${authHeader ? '存在' : '不存在'}，` +
          `auth_token Cookie: ${authCookie ? '存在' : '不存在'}`,
      );
    }

    // 對於匿名用戶，明確返回 null
    // 這樣在 Controller 中 req.user 會是 null，便於統一處理
    this.logger.debug('匿名認證通過 - 返回 null 用戶信息');
    return null;
  }
}

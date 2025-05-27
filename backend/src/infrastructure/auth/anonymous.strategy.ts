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
   * 重要：不返回任何用戶信息，確保 req.user 保持 undefined
   */
  async validate(_req: any): Promise<null> {
    // 對於匿名用戶，不提供任何用戶信息
    // 這樣在 Controller 中 req.user 會是 undefined
    this.logger.log('匿名認證通過 - 未提供任何用戶信息');
    return null;
  }
}

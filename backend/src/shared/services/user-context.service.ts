import { Injectable, Logger, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

export interface UserIdentity {
  userId: string | null;
  isAuthenticated: boolean;
  identitySource: string;
}

/**
 * 用戶上下文服務
 * 統一處理用戶身份解析和驗證邏輯
 *
 * 設計為 REQUEST scoped，確保每個請求都有獨立的實例
 */
@Injectable({ scope: Scope.REQUEST })
export class UserContextService {
  private readonly logger = new Logger(UserContextService.name);
  private _userIdentity: UserIdentity | null = null;

  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /**
   * 獲取當前用戶身份
   * 如果尚未解析，則自動執行解析
   */
  get userIdentity(): UserIdentity {
    if (!this._userIdentity) {
      this._userIdentity = this.extractUserIdentity();
    }
    return this._userIdentity;
  }

  /**
   * 獲取用戶 ID
   */
  get userId(): string | null {
    return this.userIdentity.userId;
  }

  /**
   * 檢查用戶是否已認證
   */
  get isAuthenticated(): boolean {
    return this.userIdentity.isAuthenticated;
  }

  /**
   * 提取並驗證用戶身份
   */
  private extractUserIdentity(): UserIdentity {
    const userInfo = (this.request as any).user;

    this.logger.debug(
      `開始用戶身份識別，原始數據: ${JSON.stringify(userInfo)}`,
    );

    // 處理 null 或 undefined 的情況（匿名用戶）
    if (!userInfo) {
      this.logger.debug('用戶信息為空，判定為匿名用戶');
      return {
        userId: null,
        isAuthenticated: false,
        identitySource: 'anonymous',
      };
    }

    // 檢查用戶信息的類型
    if (typeof userInfo !== 'object') {
      this.logger.warn(
        `用戶信息類型異常: ${typeof userInfo}，當作匿名用戶處理`,
      );
      return {
        userId: null,
        isAuthenticated: false,
        identitySource: 'invalid_type',
      };
    }

    // 按優先級嘗試提取用戶ID
    const extractionMethods = [
      { field: 'sub', source: 'jwt_strategy' }, // JWT 策略標準欄位
      { field: 'id', source: 'user_entity' }, // 用戶實體ID
      { field: 'userId', source: 'legacy_format' }, // 舊格式用戶ID
      { field: 'user_id', source: 'snake_case' }, // 蛇形命名
    ];

    for (const method of extractionMethods) {
      const value = userInfo[method.field];
      if (value && typeof value === 'string') {
        const userId = value.trim();
        if (userId.length > 0) {
          this.logger.debug(
            `成功從 ${method.field} 欄位提取用戶ID: ${userId} (來源: ${method.source})`,
          );

          // 驗證用戶ID格式（UUID或其他合法格式）
          if (this.isValidUserId(userId)) {
            return {
              userId,
              isAuthenticated: true,
              identitySource: method.source,
            };
          } else {
            this.logger.warn(
              `用戶ID格式無效: ${userId} (來源: ${method.source})`,
            );
          }
        }
      }
    }

    // 如果無法提取有效的用戶ID，記錄詳細信息
    const availableFields = Object.keys(userInfo).join(', ');
    this.logger.warn(
      `無法提取有效用戶ID，當作匿名用戶處理。` +
        `可用欄位: ${availableFields}，` +
        `用戶信息: ${JSON.stringify(userInfo)}`,
    );

    return {
      userId: null,
      isAuthenticated: false,
      identitySource: 'extraction_failed',
    };
  }

  /**
   * 驗證用戶ID格式是否合法
   */
  private isValidUserId(userId: string): boolean {
    // UUID格式驗證
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // 其他可接受的格式（可根據需要調整）
    const otherValidFormats = [
      /^[a-zA-Z0-9_-]{8,64}$/, // 8-64位字母數字和符號
    ];

    return (
      uuidRegex.test(userId) ||
      otherValidFormats.some((regex) => regex.test(userId))
    );
  }

  /**
   * 強制重新解析用戶身份（在特殊情況下使用）
   */
  refreshUserIdentity(): UserIdentity {
    this._userIdentity = this.extractUserIdentity();
    return this._userIdentity;
  }
}

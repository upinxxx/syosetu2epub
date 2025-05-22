import { randomUUID } from 'crypto';
import { Entity } from './entity.js';

/**
 * 使用者角色枚舉
 */
export enum UserRole {
  FREE = 'free',
  PRO = 'pro',
}

/**
 * 使用者領域實體
 * 負責處理使用者的業務邏輯和驗證規則
 */
export class User implements Entity<User> {
  private _id: string;
  private _googleId: string;
  private _email: string;
  private _displayName: string;
  private _role: UserRole;
  private _upgradedAt?: Date;
  private _dailyEmailQuota: number;
  private _lastLoginAt?: Date;
  private _createdAt: Date;

  private constructor(
    id: string,
    googleId: string,
    email: string,
    displayName: string,
    role: UserRole,
    createdAt: Date,
    dailyEmailQuota: number = 0,
    upgradedAt?: Date,
    lastLoginAt?: Date,
  ) {
    this._id = id;
    this._googleId = googleId;
    this._email = email;
    this._displayName = displayName;
    this._role = role;
    this._upgradedAt = upgradedAt;
    this._dailyEmailQuota = dailyEmailQuota;
    this._lastLoginAt = lastLoginAt;
    this._createdAt = createdAt;

    this.validateState();
  }

  /**
   * 創建新的使用者實體
   */
  public static create(
    googleId: string,
    email: string,
    displayName: string,
  ): User {
    if (!googleId || googleId.trim() === '') {
      throw new Error('Google ID 不能為空');
    }

    if (!email || !this.validateEmail(email)) {
      throw new Error('郵箱不能為空或格式不正確');
    }

    if (!displayName || displayName.trim() === '') {
      throw new Error('顯示名稱不能為空');
    }

    return new User(
      randomUUID(),
      googleId,
      email,
      displayName,
      UserRole.FREE,
      new Date(),
      0,
    );
  }

  /**
   * 從現有數據重建使用者實體
   */
  public static reconstitute(
    id: string,
    googleId: string,
    email: string,
    displayName: string,
    role: UserRole,
    createdAt: Date,
    dailyEmailQuota: number = 0,
    upgradedAt?: Date,
    lastLoginAt?: Date,
  ): User {
    return new User(
      id,
      googleId,
      email,
      displayName,
      role,
      createdAt,
      dailyEmailQuota,
      upgradedAt,
      lastLoginAt,
    );
  }

  /**
   * 升級使用者為 PRO 角色
   */
  public upgradeToPro(): void {
    if (this._role === UserRole.PRO) {
      return;
    }

    this._role = UserRole.PRO;
    this._upgradedAt = new Date();
    this._dailyEmailQuota = 10; // 假設 PRO 用戶每日可發送 10 封郵件
  }

  /**
   * 記錄使用者登入
   */
  public recordLogin(): void {
    this._lastLoginAt = new Date();
  }

  /**
   * 消耗郵件配額
   * @returns 是否成功消耗配額
   */
  public consumeEmailQuota(): boolean {
    if (this._dailyEmailQuota <= 0) {
      return false;
    }

    this._dailyEmailQuota--;
    return true;
  }

  /**
   * 重置郵件配額
   */
  public resetEmailQuota(): void {
    this._dailyEmailQuota = this._role === UserRole.PRO ? 10 : 3;
  }

  /**
   * 驗證郵箱格式
   */
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 驗證實體狀態
   */
  private validateState(): void {
    if (!this._id) {
      throw new Error('ID 不能為空');
    }

    if (!this._googleId || this._googleId.trim() === '') {
      throw new Error('Google ID 不能為空');
    }

    if (!this._email || !User.validateEmail(this._email)) {
      throw new Error('郵箱不能為空或格式不正確');
    }

    if (!this._displayName || this._displayName.trim() === '') {
      throw new Error('顯示名稱不能為空');
    }

    if (!this._role) {
      throw new Error('角色不能為空');
    }

    if (!this._createdAt) {
      throw new Error('創建時間不能為空');
    }

    if (this._role === UserRole.PRO && !this._upgradedAt) {
      throw new Error('PRO 用戶必須有升級時間');
    }
  }

  /**
   * 檢查使用者是否為 PRO 角色
   */
  public isPro(): boolean {
    return this._role === UserRole.PRO;
  }

  /**
   * 檢查兩個使用者實體是否相等
   */
  public equals(entity: Entity<User>): boolean {
    if (!(entity instanceof User)) {
      return false;
    }

    return this._id === entity.id;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get googleId(): string {
    return this._googleId;
  }

  get email(): string {
    return this._email;
  }

  get displayName(): string {
    return this._displayName;
  }

  get role(): UserRole {
    return this._role;
  }

  get upgradedAt(): Date | undefined {
    return this._upgradedAt;
  }

  get dailyEmailQuota(): number {
    return this._dailyEmailQuota;
  }

  get lastLoginAt(): Date | undefined {
    return this._lastLoginAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}

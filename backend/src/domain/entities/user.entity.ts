import { randomUUID } from 'crypto';
import { Entity } from './entity.js';

/**
 * 使用者領域實體
 * 負責處理使用者的業務邏輯和驗證規則
 */
export class User implements Entity<User> {
  private _id: string;
  private _googleId: string;
  private _email: string;
  private _displayName: string;
  private _kindleEmail?: string;
  private _dailyEmailQuota: number;
  private _lastLoginAt?: Date;
  private _createdAt: Date;

  private constructor(
    id: string,
    googleId: string,
    email: string,
    displayName: string,
    createdAt: Date,
    dailyEmailQuota: number = 0,
    kindleEmail?: string,
    lastLoginAt?: Date,
  ) {
    this._id = id;
    this._googleId = googleId;
    this._email = email;
    this._displayName = displayName;
    this._kindleEmail = kindleEmail;
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
      new Date(),
      3, // 預設每日郵件配額
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
    createdAt: Date,
    dailyEmailQuota: number = 0,
    kindleEmail?: string,
    lastLoginAt?: Date,
  ): User {
    return new User(
      id,
      googleId,
      email,
      displayName,
      createdAt,
      dailyEmailQuota,
      kindleEmail,
      lastLoginAt,
    );
  }

  /**
   * 驗證郵箱格式
   */
  private static validateEmail(email: string): boolean {
    // 簡易驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 驗證 Kindle 電子郵件格式
   */
  private validateKindleEmail(kindleEmail: string): boolean {
    // Kindle 電子郵件驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !kindleEmail || emailRegex.test(kindleEmail);
  }

  /**
   * 記錄用戶登入
   */
  public recordLogin(): void {
    this._lastLoginAt = new Date();
  }

  /**
   * 設定 Kindle 電子郵件
   */
  public setKindleEmail(kindleEmail?: string): void {
    if (kindleEmail && !this.validateKindleEmail(kindleEmail)) {
      throw new Error('Kindle 電子郵件格式不正確');
    }

    this._kindleEmail = kindleEmail;
  }

  /**
   * 重置郵件配額
   */
  public resetEmailQuota(): void {
    this._dailyEmailQuota = 3; // 所有使用者都有相同的配額
  }

  /**
   * 消耗郵件配額
   */
  public consumeEmailQuota(): void {
    if (this._dailyEmailQuota <= 0) {
      throw new Error('已超出今日郵件配額');
    }

    this._dailyEmailQuota -= 1;
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

    if (this._kindleEmail && !this.validateKindleEmail(this._kindleEmail)) {
      throw new Error('Kindle 電子郵件格式不正確');
    }

    if (!this._createdAt) {
      throw new Error('創建時間不能為空');
    }
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

  get kindleEmail(): string | undefined {
    return this._kindleEmail;
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

import { randomUUID } from 'crypto';
import { Entity } from './entity.js';
import { EpubJob } from './epub-job.entity.js';
import { User } from './user.entity.js';
import { DeliveryStatus } from '../enums/delivery-status.enum.js';

/**
 * Kindle 交付領域實體
 * 負責處理 Kindle 電子郵件交付的業務邏輯和狀態轉換
 */
export class KindleDelivery implements Entity<KindleDelivery> {
  private _id: string;
  private _epubJobId: string;
  private _epubJob?: EpubJob;
  private _userId: string;
  private _user?: User;
  private _toEmail: string;
  private _status: DeliveryStatus;
  private _errorMessage?: string;
  private _sentAt?: Date;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    epubJobId: string,
    userId: string,
    toEmail: string,
    status: DeliveryStatus,
    createdAt: Date,
    updatedAt: Date,
    epubJob?: EpubJob,
    user?: User,
    errorMessage?: string,
    sentAt?: Date,
  ) {
    this._id = id;
    this._epubJobId = epubJobId;
    this._epubJob = epubJob;
    this._userId = userId;
    this._user = user;
    this._toEmail = toEmail;
    this._status = status;
    this._errorMessage = errorMessage;
    this._sentAt = sentAt;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    this.validateState();
  }

  /**
   * 創建新的 Kindle 交付任務
   */
  public static create(
    epubJobId: string,
    userId: string,
    toEmail: string,
    epubJob?: EpubJob,
    user?: User,
  ): KindleDelivery {
    if (!epubJobId) {
      throw new Error('EPUB 任務 ID 不能為空');
    }

    if (!userId) {
      throw new Error('使用者 ID 不能為空');
    }

    if (!toEmail) {
      throw new Error('目標郵箱不能為空');
    }

    const now = new Date();
    return new KindleDelivery(
      randomUUID(),
      epubJobId,
      userId,
      toEmail,
      DeliveryStatus.PENDING,
      now,
      now,
      epubJob,
      user,
    );
  }

  /**
   * 從現有數據重建 Kindle 交付實體
   */
  public static reconstitute({
    id,
    epubJobId,
    userId,
    toEmail,
    status,
    createdAt,
    updatedAt,
    epubJob,
    user,
    errorMessage,
    sentAt,
  }: {
    id: string;
    epubJobId: string;
    userId: string;
    toEmail: string;
    status: DeliveryStatus;
    createdAt: Date;
    updatedAt: Date;
    epubJob?: EpubJob;
    user?: User;
    errorMessage?: string;
    sentAt?: Date;
  }): KindleDelivery {
    return new KindleDelivery(
      id,
      epubJobId,
      userId,
      toEmail,
      status,
      createdAt,
      updatedAt,
      epubJob,
      user,
      errorMessage,
      sentAt,
    );
  }

  /**
   * 開始處理交付
   */
  public startProcessing(): void {
    if (this._status !== DeliveryStatus.PENDING) {
      throw new Error(`無法開始處理狀態為 ${this._status} 的交付`);
    }

    this._status = DeliveryStatus.PROCESSING;
    this._updatedAt = new Date();
  }

  /**
   * 標記交付成功
   */
  public markSuccess(): void {
    if (this._status !== DeliveryStatus.PROCESSING) {
      throw new Error(`無法將狀態為 ${this._status} 的交付標記為成功`);
    }

    this._status = DeliveryStatus.COMPLETED;
    this._sentAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * 標記交付失敗
   */
  public markFailed(errorMessage: string): void {
    if (this._status === DeliveryStatus.COMPLETED) {
      throw new Error('已成功的交付不能標記為失敗');
    }

    if (!errorMessage) {
      throw new Error('錯誤訊息不能為空');
    }

    this._status = DeliveryStatus.FAILED;
    this._errorMessage = errorMessage;
    this._updatedAt = new Date();
  }

  /**
   * 驗證實體狀態
   */
  private validateState(): void {
    if (!this._id) {
      throw new Error('ID 不能為空');
    }

    if (!this._epubJobId) {
      throw new Error('EPUB 任務 ID 不能為空');
    }

    if (!this._userId) {
      throw new Error('使用者 ID 不能為空');
    }

    if (!this._toEmail) {
      throw new Error('目標郵箱不能為空');
    }

    if (!this._status) {
      throw new Error('狀態不能為空');
    }

    if (!this._createdAt) {
      throw new Error('創建時間不能為空');
    }

    if (!this._updatedAt) {
      throw new Error('更新時間不能為空');
    }

    if (this._status === DeliveryStatus.FAILED && !this._errorMessage) {
      throw new Error('失敗的交付必須有錯誤訊息');
    }

    if (this._status === DeliveryStatus.COMPLETED && !this._sentAt) {
      throw new Error('成功的交付必須有發送時間');
    }
  }

  /**
   * 檢查兩個 Kindle 交付實體是否相等
   */
  public equals(entity: Entity<KindleDelivery>): boolean {
    if (!(entity instanceof KindleDelivery)) {
      return false;
    }

    return this._id === entity.id;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get epubJobId(): string {
    return this._epubJobId;
  }

  get epubJob(): EpubJob | undefined {
    return this._epubJob;
  }

  get userId(): string {
    return this._userId;
  }

  get user(): User | undefined {
    return this._user;
  }

  get toEmail(): string {
    return this._toEmail;
  }

  get status(): DeliveryStatus {
    return this._status;
  }

  get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  get sentAt(): Date | undefined {
    return this._sentAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}

import { randomUUID } from 'crypto';
import { Entity } from './entity.js';
import { User } from './user.entity.js';
import { EpubJob } from './epub-job.entity.js';

/**
 * 郵件日誌狀態枚舉
 */
export enum EmailLogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

/**
 * 郵件日誌領域實體
 * 負責處理郵件發送日誌的業務邏輯
 */
export class EmailLog implements Entity<EmailLog> {
  private _id: string;
  private _userId: string;
  private _user?: User;
  private _epubJobId: string;
  private _epubJob?: EpubJob;
  private _toEmail: string;
  private _status: EmailLogStatus;
  private _errorMessage?: string;
  private _ip?: string;
  private _sentAt: Date;

  private constructor(
    id: string,
    userId: string,
    epubJobId: string,
    toEmail: string,
    status: EmailLogStatus,
    sentAt: Date,
    user?: User,
    epubJob?: EpubJob,
    errorMessage?: string,
    ip?: string,
  ) {
    this._id = id;
    this._userId = userId;
    this._user = user;
    this._epubJobId = epubJobId;
    this._epubJob = epubJob;
    this._toEmail = toEmail;
    this._status = status;
    this._errorMessage = errorMessage;
    this._ip = ip;
    this._sentAt = sentAt;

    this.validateState();
  }

  /**
   * 創建新的郵件日誌實體
   */
  public static create(
    userId: string,
    epubJobId: string,
    toEmail: string,
    ip?: string,
    user?: User,
    epubJob?: EpubJob,
  ): EmailLog {
    if (!userId) {
      throw new Error('使用者 ID 不能為空');
    }

    if (!epubJobId) {
      throw new Error('EPUB 任務 ID 不能為空');
    }

    if (!toEmail || !this.validateEmail(toEmail)) {
      throw new Error('收件人郵箱不能為空或格式不正確');
    }

    return new EmailLog(
      randomUUID(),
      userId,
      epubJobId,
      toEmail,
      EmailLogStatus.SUCCESS,
      new Date(),
      user,
      epubJob,
      undefined,
      ip,
    );
  }

  /**
   * 從現有數據重建郵件日誌實體
   */
  public static reconstitute(
    id: string,
    userId: string,
    epubJobId: string,
    toEmail: string,
    status: EmailLogStatus,
    sentAt: Date,
    user?: User,
    epubJob?: EpubJob,
    errorMessage?: string,
    ip?: string,
  ): EmailLog {
    return new EmailLog(
      id,
      userId,
      epubJobId,
      toEmail,
      status,
      sentAt,
      user,
      epubJob,
      errorMessage,
      ip,
    );
  }

  /**
   * 標記郵件發送失敗
   */
  public markAsFailed(errorMessage: string): void {
    this._status = EmailLogStatus.FAILED;
    this._errorMessage = errorMessage;
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

    if (!this._userId) {
      throw new Error('使用者 ID 不能為空');
    }

    if (!this._epubJobId) {
      throw new Error('EPUB 任務 ID 不能為空');
    }

    if (!this._toEmail || !EmailLog.validateEmail(this._toEmail)) {
      throw new Error('收件人郵箱不能為空或格式不正確');
    }

    if (!this._status) {
      throw new Error('狀態不能為空');
    }

    if (!this._sentAt) {
      throw new Error('發送時間不能為空');
    }

    if (this._status === EmailLogStatus.FAILED && !this._errorMessage) {
      throw new Error('失敗的郵件必須有錯誤訊息');
    }
  }

  /**
   * 檢查兩個郵件日誌實體是否相等
   */
  public equals(entity: Entity<EmailLog>): boolean {
    if (!(entity instanceof EmailLog)) {
      return false;
    }

    return this._id === entity.id;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get user(): User | undefined {
    return this._user;
  }

  get epubJobId(): string {
    return this._epubJobId;
  }

  get epubJob(): EpubJob | undefined {
    return this._epubJob;
  }

  get toEmail(): string {
    return this._toEmail;
  }

  get status(): EmailLogStatus {
    return this._status;
  }

  get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  get ip(): string | undefined {
    return this._ip;
  }

  get sentAt(): Date {
    return this._sentAt;
  }
}

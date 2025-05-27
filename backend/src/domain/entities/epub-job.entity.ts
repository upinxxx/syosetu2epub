import { Novel } from './novel.entity.js';
import { User } from './user.entity.js';
import { randomUUID } from 'crypto';
import { Entity } from './entity.js';
import { JobStatus } from '../enums/job-status.enum.js';

/**
 * EPUB 任務領域實體
 * 負責處理 EPUB 生成任務的業務邏輯和狀態轉換
 */
export class EpubJob implements Entity<EpubJob> {
  private _id: string;
  private _novelId: string;
  private _novel?: Novel;
  private _userId?: string | null;
  private _user?: User;
  private _status: JobStatus;
  private _publicUrl?: string;
  private _errorMessage?: string;
  private _createdAt: Date;
  private _completedAt?: Date;
  private _startedAt?: Date;

  private constructor(
    id: string,
    novelId: string,
    status: JobStatus,
    createdAt: Date,
    novel?: Novel,
    userId?: string | null,
    user?: User,
    publicUrl?: string,
    errorMessage?: string,
    completedAt?: Date,
    startedAt?: Date,
  ) {
    this._id = id;
    this._novelId = novelId;
    this._novel = novel;
    this._userId = userId;
    this._user = user;
    this._status = status;
    this._publicUrl = publicUrl;
    this._errorMessage = errorMessage;
    this._createdAt = createdAt;
    this._completedAt = completedAt;
    this._startedAt = startedAt;

    this.validateState();
  }

  /**
   * 創建新的 EPUB 任務
   * @param novelId 小說ID
   * @param novel 小說實體（可選）
   * @param userId 用戶ID（可選，匿名用戶為 null）
   * @param user 用戶實體（可選）
   */
  public static create(
    novelId: string,
    novel?: Novel,
    userId?: string | null,
    user?: User,
  ): EpubJob {
    if (!novelId) {
      throw new Error('小說 ID 不能為空');
    }

    return new EpubJob(
      randomUUID(),
      novelId,
      JobStatus.QUEUED,
      new Date(),
      novel,
      userId,
      user,
    );
  }

  /**
   * 從現有數據重建 EPUB 任務實體
   */
  public static reconstitute({
    id,
    novelId,
    status,
    createdAt,
    novel,
    userId,
    user,
    publicUrl,
    errorMessage,
    completedAt,
    startedAt,
  }: {
    id: string;
    novelId: string;
    status: JobStatus;
    createdAt: Date;
    novel?: Novel;
    userId?: string | null;
    user?: User;
    publicUrl?: string;
    errorMessage?: string;
    completedAt?: Date;
    startedAt?: Date;
  }): EpubJob {
    return new EpubJob(
      id,
      novelId,
      status,
      createdAt,
      novel,
      userId,
      user,
      publicUrl,
      errorMessage,
      completedAt,
      startedAt,
    );
  }

  /**
   * 開始處理 EPUB 任務
   */
  public startProcessing(): void {
    if (this._status !== JobStatus.QUEUED) {
      throw new Error(`無法開始處理狀態為 ${this._status} 的任務`);
    }

    this._status = JobStatus.PROCESSING;
    this._startedAt = new Date();
  }

  /**
   * 完成 EPUB 任務
   */
  public complete(publicUrl: string): void {
    if (this._status !== JobStatus.PROCESSING) {
      throw new Error(`無法完成狀態為 ${this._status} 的任務`);
    }

    if (!publicUrl) {
      throw new Error('公開 URL 不能為空');
    }

    this._status = JobStatus.COMPLETED;
    this._publicUrl = publicUrl;
    this._completedAt = new Date();
  }

  /**
   * 標記任務為失敗
   */
  public fail(errorMessage: string): void {
    if (this._status === JobStatus.COMPLETED) {
      throw new Error('已完成的任務不能標記為失敗');
    }

    this._status = JobStatus.FAILED;
    this._errorMessage = errorMessage;
    this._completedAt = new Date();
  }

  /**
   * 驗證實體狀態
   */
  private validateState(): void {
    if (!this._id) {
      throw new Error('ID 不能為空');
    }

    if (!this._novelId) {
      throw new Error('小說 ID 不能為空');
    }

    if (!this._status) {
      throw new Error('狀態不能為空');
    }

    if (!this._createdAt) {
      throw new Error('創建時間不能為空');
    }

    if (this._status === JobStatus.COMPLETED && !this._publicUrl) {
      throw new Error('已完成的任務必須有公開 URL');
    }

    if (this._status === JobStatus.FAILED && !this._errorMessage) {
      throw new Error('失敗的任務必須有錯誤訊息');
    }

    if (this._status === JobStatus.PROCESSING && !this._startedAt) {
      throw new Error('處理中的任務必須有開始時間');
    }
  }

  /**
   * 檢查兩個 EPUB 任務實體是否相等
   */
  public equals(entity: Entity<EpubJob>): boolean {
    if (!(entity instanceof EpubJob)) {
      return false;
    }

    return this._id === entity.id;
  }

  /**
   * 檢查任務是否已完成
   */
  public isCompleted(): boolean {
    return this._status === JobStatus.COMPLETED;
  }

  /**
   * 檢查任務是否已失敗
   */
  public isFailed(): boolean {
    return this._status === JobStatus.FAILED;
  }

  /**
   * 檢查任務是否正在處理中
   */
  public isProcessing(): boolean {
    return this._status === JobStatus.PROCESSING;
  }

  /**
   * 檢查任務是否在佇列中
   */
  public isQueued(): boolean {
    return this._status === JobStatus.QUEUED;
  }

  /**
   * 取得任務處理時間（毫秒）
   */
  public getProcessingTimeMs(): number | null {
    if (!this._startedAt || !this._completedAt) {
      return null;
    }
    return this._completedAt.getTime() - this._startedAt.getTime();
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get novelId(): string {
    return this._novelId;
  }

  get novel(): Novel | undefined {
    return this._novel;
  }

  get userId(): string | null | undefined {
    return this._userId;
  }

  get user(): User | undefined {
    return this._user;
  }

  get status(): JobStatus {
    return this._status;
  }

  get publicUrl(): string | undefined {
    return this._publicUrl;
  }

  get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  get startedAt(): Date | undefined {
    return this._startedAt;
  }
}

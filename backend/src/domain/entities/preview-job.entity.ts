import { Entity } from './entity.js';
import { randomUUID } from 'crypto';
import { JobStatus } from '../enums/job-status.enum.js';
import { NovelSource } from '../enums/novel-source.enum.js';

/**
 * 預覽任務實體
 * 負責處理預覽任務的業務邏輯
 */
export class PreviewJob implements Entity<PreviewJob> {
  private _id: string;
  private _source: NovelSource;
  private _sourceId: string;
  private _userId?: string;
  private _status: JobStatus;
  private _errorMessage?: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _completedAt?: Date;

  private constructor(
    id: string,
    source: NovelSource,
    sourceId: string,
    userId: string | undefined,
    status: JobStatus,
    createdAt: Date,
    updatedAt: Date,
    errorMessage?: string,
    completedAt?: Date,
  ) {
    this._id = id;
    this._source = source;
    this._sourceId = sourceId;
    this._userId = userId;
    this._status = status;
    this._errorMessage = errorMessage;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._completedAt = completedAt;
  }

  /**
   * 創建預覽任務
   */
  public static create(
    source: NovelSource,
    sourceId: string,
    userId?: string,
  ): PreviewJob {
    const now = new Date();
    return new PreviewJob(
      randomUUID(),
      source,
      sourceId,
      userId,
      JobStatus.QUEUED,
      now,
      now,
    );
  }

  /**
   * 重建實體（用於從資料庫載入）
   */
  public static reconstitute(
    id: string,
    source: NovelSource,
    sourceId: string,
    userId: string | undefined,
    status: JobStatus,
    createdAt: Date,
    updatedAt: Date,
    errorMessage?: string,
    completedAt?: Date,
  ): PreviewJob {
    return new PreviewJob(
      id,
      source,
      sourceId,
      userId,
      status,
      createdAt,
      updatedAt,
      errorMessage,
      completedAt,
    );
  }

  /**
   * 更新任務狀態
   */
  public updateStatus(status: JobStatus, errorMessage?: string): void {
    this._status = status;
    this._updatedAt = new Date();

    if (errorMessage) {
      this._errorMessage = errorMessage;
    }

    if (status === JobStatus.COMPLETED) {
      this._completedAt = new Date();
    }
  }

  /**
   * 檢查兩個實體是否相等
   * 基於實體的唯一識別碼進行比較
   */
  public equals(entity: Entity<PreviewJob>): boolean {
    if (entity === null || entity === undefined) {
      return false;
    }
    if (this === entity) {
      return true;
    }
    return this._id === entity.id;
  }

  /**
   * 實體標識
   */
  get id(): string {
    return this._id;
  }

  /**
   * 小說來源
   */
  get source(): NovelSource {
    return this._source;
  }

  /**
   * 小說來源 ID
   */
  get sourceId(): string {
    return this._sourceId;
  }

  /**
   * 使用者 ID
   */
  get userId(): string | undefined {
    return this._userId;
  }

  /**
   * 任務狀態
   */
  get status(): JobStatus {
    return this._status;
  }

  /**
   * 錯誤訊息
   */
  get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  /**
   * 創建時間
   */
  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * 更新時間
   */
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * 完成時間
   */
  get completedAt(): Date | undefined {
    return this._completedAt;
  }
}

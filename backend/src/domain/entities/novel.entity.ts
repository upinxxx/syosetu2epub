import { randomUUID } from 'crypto';
import { Entity } from './entity.js';

/**
 * 小說領域實體
 * 負責處理小說的業務邏輯和驗證規則
 */
export class Novel implements Entity<Novel> {
  private _id: string;
  private _source: string;
  private _sourceId: string;
  private _title: string;
  private _author?: string;
  private _description?: string;
  private _coverUrl?: string;
  private _createdAt: Date;
  private _novelUpdatedAt?: Date;

  private constructor(
    id: string,
    source: string,
    sourceId: string,
    title: string,
    createdAt: Date,
    author?: string,
    description?: string,
    coverUrl?: string,
    novelUpdatedAt?: Date,
  ) {
    this._id = id;
    this._source = source;
    this._sourceId = sourceId;
    this._title = title;
    this._author = author;
    this._description = description;
    this._coverUrl = coverUrl;
    this._createdAt = createdAt;
    this._novelUpdatedAt = novelUpdatedAt;

    this.validateState();
  }

  /**
   * 創建新的小說實體
   */
  public static create(
    source: string,
    sourceId: string,
    title: string,
    author?: string,
    description?: string,
    coverUrl?: string,
  ): Novel {
    this.validateSourceAndSourceId(source, sourceId);

    if (!title || title.trim() === '') {
      throw new Error('小說標題不能為空');
    }

    return new Novel(
      randomUUID(),
      source,
      sourceId,
      title,
      new Date(),
      author,
      description,
      coverUrl,
    );
  }

  /**
   * 從現有數據重建小說實體
   */
  public static reconstitute(
    id: string,
    source: string,
    sourceId: string,
    title: string,
    createdAt: Date,
    author?: string,
    description?: string,
    coverUrl?: string,
    novelUpdatedAt?: Date,
  ): Novel {
    return new Novel(
      id,
      source,
      sourceId,
      title,
      createdAt,
      author,
      description,
      coverUrl,
      novelUpdatedAt,
    );
  }

  /**
   * 驗證來源和來源ID
   */
  private static validateSourceAndSourceId(
    source: string,
    sourceId: string,
  ): void {
    if (!source || source.trim() === '') {
      throw new Error('小說來源不能為空');
    }

    if (!sourceId || sourceId.trim() === '') {
      throw new Error('小說來源ID不能為空');
    }

    // 驗證支援的來源
    const supportedSources = ['syosetu', 'kakuyomu', 'novelup', 'narou'];
    if (!supportedSources.includes(source.toLowerCase())) {
      throw new Error(`不支援的小說來源: ${source}`);
    }
  }

  /**
   * 驗證實體狀態
   */
  private validateState(): void {
    if (!this._id) {
      throw new Error('ID 不能為空');
    }

    Novel.validateSourceAndSourceId(this._source, this._sourceId);

    if (!this._title || this._title.trim() === '') {
      throw new Error('小說標題不能為空');
    }

    if (!this._createdAt) {
      throw new Error('創建時間不能為空');
    }
  }

  /**
   * 更新小說資訊
   */
  public update(
    title: string,
    author?: string,
    description?: string,
    coverUrl?: string,
  ): void {
    if (!title || title.trim() === '') {
      throw new Error('小說標題不能為空');
    }

    this._title = title;
    this._author = author;
    this._description = description;
    this._coverUrl = coverUrl;
    this._novelUpdatedAt = new Date();
  }

  /**
   * 取得小說的唯一識別碼 (source + sourceId)
   */
  public getUniqueIdentifier(): string {
    return `${this._source}:${this._sourceId}`;
  }

  /**
   * 檢查兩個小說實體是否相等
   */
  public equals(entity: Entity<Novel>): boolean {
    if (!(entity instanceof Novel)) {
      return false;
    }

    return this._id === entity.id;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get source(): string {
    return this._source;
  }

  get sourceId(): string {
    return this._sourceId;
  }

  get title(): string {
    return this._title;
  }

  get author(): string | undefined {
    return this._author;
  }

  get description(): string | undefined {
    return this._description;
  }

  get coverUrl(): string | undefined {
    return this._coverUrl;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get novelUpdatedAt(): Date | undefined {
    return this._novelUpdatedAt;
  }
}

import { Entity } from '../entities/entity.js';

/**
 * 通用儲存庫接口
 * 定義與持久化層交互的方法
 */
export interface Repository<T extends Entity<unknown>> {
  /**
   * 根據 ID 查找實體
   */
  findById(id: string): Promise<T | null>;

  /**
   * 保存實體
   */
  save(entity: T): Promise<T>;

  /**
   * 刪除實體
   */
  delete(entity: T): Promise<void>;
}

/**
 * 分頁結果接口
 */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 分頁選項接口
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

/**
 * 支持分頁的儲存庫接口
 */
export interface PagedRepository<T extends Entity<unknown>>
  extends Repository<T> {
  /**
   * 分頁查詢實體
   */
  findPaged(options: PaginationOptions): Promise<PagedResult<T>>;
}

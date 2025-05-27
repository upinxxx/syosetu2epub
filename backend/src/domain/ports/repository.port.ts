import { Entity } from '../entities/entity.js';
import { User } from '../entities/user.entity.js';

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

  /**
   * 更新實體
   */
  update?(entity: T): Promise<T>;

  /**
   * 創建新的持久化實體
   */
  create?(entityData: any): any;
}

/**
 * 使用者儲存庫接口
 * 擴展通用儲存庫接口，為使用者實體提供特定的查詢方法
 */
export interface UserRepository extends Repository<User> {
  /**
   * 根據電子郵件查找使用者
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * 根據 Google ID 查找使用者
   */
  findByGoogleId(googleId: string): Promise<User | null>;
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

/**
 * 支持分頁的使用者儲存庫接口
 */
export interface PagedUserRepository
  extends UserRepository,
    PagedRepository<User> {}

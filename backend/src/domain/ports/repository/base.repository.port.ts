/**
 * 基礎 Repository 接口定義
 */

// 核心接口
export interface Entity<T> {
  readonly id: string;
  equals(entity: Entity<T>): boolean;
}

// CrudRepository
export interface CrudRepository<T extends Entity<unknown>> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(entity: T): Promise<void>;
}

// PagedRepository
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PagedRepository<T extends Entity<unknown>>
  extends CrudRepository<T> {
  findPaged(options: PaginationOptions): Promise<PagedResult<T>>;
}

// 舊接口兼容層，方便漸進式遷移
export type Repository<T extends Entity<unknown>> = CrudRepository<T>;

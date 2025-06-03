/**
 * Repository 接口桶(Barrel)
 * 用於減少 import 路徑長度
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

// Novel Repository
import { Novel } from '../../entities/novel.entity.js';
export interface NovelRepository
  extends CrudRepository<Novel>,
    PagedRepository<Novel> {
  findBySourceAndSourceId(
    source: string,
    sourceId: string,
  ): Promise<Novel | null>;
}
export const NOVEL_REPOSITORY_TOKEN = 'NOVEL_REPOSITORY';

// EpubJob Repository
import { EpubJob } from '../../entities/epub-job.entity.js';
import { JobStatus } from '../../enums/job-status.enum.js';
export interface EpubJobRepository
  extends CrudRepository<EpubJob>,
    PagedRepository<EpubJob> {
  findLatestByNovelId(novelId: string): Promise<EpubJob | null>;
  findByStatus(statuses: JobStatus[]): Promise<EpubJob[]>;
  findRecentActiveJobs(since: Date): Promise<EpubJob[]>;
  findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PagedResult<EpubJob>>;
  findRecentByUserId(userId: string, withinDays: number): Promise<EpubJob[]>;
  updateStatus(id: string, status: JobStatus): Promise<EpubJob>;
  updateDownloadUrl(id: string, publicUrl: string): Promise<EpubJob>;
}
export const EPUB_JOB_REPOSITORY_TOKEN = 'EPUB_JOB_REPOSITORY';

// User Repository
import { User } from '../../entities/user.entity.js';
export interface UserRepository
  extends CrudRepository<User>,
    PagedRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
}
export const USER_REPOSITORY_TOKEN = 'USER_REPOSITORY';

// KindleDelivery Repository
import { KindleDelivery } from '../../entities/kindle-delivery.entity.js';
export interface KindleDeliveryRepository
  extends CrudRepository<KindleDelivery> {
  findByEpubJobId(epubJobId: string): Promise<KindleDelivery[]>;
  findByUserId(userId: string): Promise<KindleDelivery[]>;
  findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: KindleDelivery[];
    totalItems: number;
    totalPages: number;
  }>;
}
export const KINDLE_DELIVERY_REPOSITORY_TOKEN = 'KINDLE_DELIVERY_REPOSITORY';

// 舊接口兼容層，方便漸進式遷移
export type Repository<T extends Entity<unknown>> = CrudRepository<T>;
export type PagedUserRepository = UserRepository;

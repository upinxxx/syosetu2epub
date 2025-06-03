import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository as TypeOrmRepository,
  LessThan,
  Not,
  In,
  MoreThan,
} from 'typeorm';
import {
  EpubJobRepository,
  PagedResult,
  PaginationOptions,
} from '@/domain/ports/repository/index.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { EpubJobOrmEntity } from '@/infrastructure/entities/epub-job.orm-entity.js';
import { EpubJobMapper } from '@/domain/mappers/epub-job.mapper.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';
import { Logger } from '@nestjs/common';

/**
 * EpubJob 儲存庫 TypeORM 實現
 * 實現 Port 接口並調用 Mapper 進行領域模型轉換
 */
@Injectable()
export class EpubJobRepositoryTypeORM implements EpubJobRepository {
  private readonly logger = new Logger(EpubJobRepositoryTypeORM.name);

  // 🆕 性能監控統計
  private performanceStats = {
    totalQueries: 0,
    slowQueries: 0,
    averageQueryTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastResetTime: new Date(),
  };

  // 🆕 智能緩存管理
  private queryCache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private readonly defaultCacheTTL = 30000; // 30秒

  constructor(
    @InjectRepository(EpubJobOrmEntity)
    private readonly repository: TypeOrmRepository<EpubJobOrmEntity>,
  ) {
    // 🆕 啟動性能監控
    this.startPerformanceMonitoring();
  }

  // 🆕 啟動性能監控
  private startPerformanceMonitoring(): void {
    // 每5分鐘記錄性能統計
    setInterval(
      () => {
        this.logPerformanceStats();
      },
      5 * 60 * 1000,
    );

    // 每分鐘清理過期緩存
    setInterval(() => {
      this.cleanupCache();
    }, 60 * 1000);
  }

  // 🆕 記錄性能統計
  private logPerformanceStats(): void {
    if (this.performanceStats.totalQueries === 0) return;

    const hitRate =
      (this.performanceStats.cacheHits /
        (this.performanceStats.cacheHits + this.performanceStats.cacheMisses)) *
      100;

    this.logger.log('數據庫性能統計', {
      totalQueries: this.performanceStats.totalQueries,
      slowQueries: this.performanceStats.slowQueries,
      slowQueryRate:
        (
          (this.performanceStats.slowQueries /
            this.performanceStats.totalQueries) *
          100
        ).toFixed(2) + '%',
      averageQueryTime:
        this.performanceStats.averageQueryTime.toFixed(2) + 'ms',
      cacheHitRate: hitRate.toFixed(2) + '%',
      cacheSize: this.queryCache.size,
      uptime: Date.now() - this.performanceStats.lastResetTime.getTime(),
    });

    // 重置統計
    this.performanceStats = {
      totalQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastResetTime: new Date(),
    };
  }

  // 🆕 清理過期緩存
  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.queryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`清理了 ${cleanedCount} 個過期緩存項目`);
    }
  }

  // 🆕 智能緩存獲取
  private getCachedResult<T>(cacheKey: string): T | null {
    const cached = this.queryCache.get(cacheKey);
    if (!cached) {
      this.performanceStats.cacheMisses++;
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(cacheKey);
      this.performanceStats.cacheMisses++;
      return null;
    }

    this.performanceStats.cacheHits++;
    return cached.data;
  }

  // 🆕 設置緩存
  private setCachedResult(
    cacheKey: string,
    data: any,
    ttl: number = this.defaultCacheTTL,
  ): void {
    this.queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // 🆕 記錄查詢性能
  private recordQueryPerformance(duration: number, queryType: string): void {
    this.performanceStats.totalQueries++;
    this.performanceStats.averageQueryTime =
      (this.performanceStats.averageQueryTime *
        (this.performanceStats.totalQueries - 1) +
        duration) /
      this.performanceStats.totalQueries;

    // 定義慢查詢閾值
    const slowQueryThresholds = {
      findById: 1000,
      findLatestByNovelId: 800,
      findByStatus: 1500,
      findPaged: 2000,
      findByUserIdPaginated: 1500,
      findRecentByUserId: 1000,
      findRecentActiveJobs: 1500,
      updateStatus: 500,
      updateDownloadUrl: 500,
    };

    const threshold = slowQueryThresholds[queryType] || 1000;
    if (duration > threshold) {
      this.performanceStats.slowQueries++;
      this.logger.warn(
        `慢查詢檢測 - ${queryType}: ${duration}ms (閾值: ${threshold}ms)`,
      );
    }
  }

  /**
   * 根據 ID 查找 EPUB 任務
   * 🆕 增強緩存和性能監控
   */
  async findById(id: string): Promise<EpubJob | null> {
    const startTime = Date.now();
    const cacheKey = `findById:${id}`;

    try {
      // 🆕 檢查緩存
      const cachedResult = this.getCachedResult<EpubJob>(cacheKey);
      if (cachedResult) {
        this.logger.debug(`緩存命中 - findById: ${id}`);
        return cachedResult;
      }

      const entity = await this.repository.findOne({
        where: { id },
        relations: ['novel'], // 使用明確的關聯載入
      });

      const duration = Date.now() - startTime;
      this.recordQueryPerformance(duration, 'findById');

      const result = entity ? EpubJobMapper.toDomain(entity) : null;

      // 🆕 緩存結果（成功結果緩存更長時間）
      if (result) {
        this.setCachedResult(cacheKey, result, 60000); // 1分鐘
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryPerformance(duration, 'findById');
      this.logger.error(
        `findById 查詢失敗 (${duration}ms): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 根據小說 ID 查找最新的 EPUB 任務
   */
  async findLatestByNovelId(novelId: string): Promise<EpubJob | null> {
    const startTime = Date.now();

    try {
      const entity = await this.repository.findOne({
        where: { novelId },
        order: { createdAt: 'DESC' }, // 優化：確保有索引支持
        relations: ['novel'],
      });

      const duration = Date.now() - startTime;

      if (duration > 800) {
        this.logger.warn(
          `慢查詢檢測 - findLatestByNovelId: ${duration}ms for novelId: ${novelId}`,
        );
      }

      if (!entity) {
        return null;
      }
      return EpubJobMapper.toDomain(entity);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `findLatestByNovelId 查詢失敗 (${duration}ms): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 保存 EPUB 任務
   */
  async save(entity: EpubJob): Promise<EpubJob> {
    const persistenceEntity = EpubJobMapper.toPersistence(entity);
    const savedEntity = await this.repository.save(persistenceEntity);
    return EpubJobMapper.toDomain(savedEntity);
  }

  /**
   * 刪除 EPUB 任務
   */
  async delete(entity: EpubJob): Promise<void> {
    await this.repository.delete(entity.id);
  }

  /**
   * 根據狀態查詢 EPUB 任務
   * @param statuses 要查詢的狀態列表
   */
  async findByStatus(statuses: JobStatus[]): Promise<EpubJob[]> {
    const startTime = Date.now();

    try {
      // 優化：使用 IN 語句而不是多個 OR 條件
      const entities = await this.repository.find({
        where: { status: In(statuses) },
        order: { createdAt: 'DESC' },
        relations: ['novel'],
      });

      const duration = Date.now() - startTime;

      if (duration > 1500) {
        this.logger.warn(
          `慢查詢檢測 - findByStatus: ${duration}ms for ${statuses.length} statuses, found ${entities.length} records`,
        );
      }

      return EpubJobMapper.toDomainList(entities);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `findByStatus 查詢失敗 (${duration}ms): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 分頁查詢 EPUB 任務
   * 🆕 增強性能優化
   */
  async findPaged(options: PaginationOptions): Promise<PagedResult<EpubJob>> {
    const startTime = Date.now();
    const cacheKey = `findPaged:${JSON.stringify(options)}`;

    try {
      // 🆕 檢查緩存（只緩存第一頁）
      if (options.page === 1) {
        const cachedResult =
          this.getCachedResult<PagedResult<EpubJob>>(cacheKey);
        if (cachedResult) {
          this.logger.debug(`緩存命中 - findPaged: page ${options.page}`);
          return cachedResult;
        }
      }

      // 🆕 優化：使用 take/skip 進行高效分頁，添加索引提示
      const queryBuilder = this.repository
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.novel', 'novel')
        .skip((options.page - 1) * options.limit)
        .take(options.limit)
        .orderBy(
          `job.${options.sortBy || 'createdAt'}`,
          options.sortDirection || 'DESC',
        );

      // 🆕 優化：並行執行查詢和計數
      const [entities, total] = await Promise.all([
        queryBuilder.getMany(),
        queryBuilder.getCount(),
      ]);

      const duration = Date.now() - startTime;
      this.recordQueryPerformance(duration, 'findPaged');

      const items = EpubJobMapper.toDomainList(entities);
      const result = {
        items,
        total,
        page: options.page,
        limit: options.limit,
        hasMore: options.page * options.limit < total,
      };

      // 🆕 緩存第一頁結果
      if (options.page === 1) {
        this.setCachedResult(cacheKey, result, 30000); // 30秒
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryPerformance(duration, 'findPaged');
      this.logger.error(
        `findPaged 查詢失敗 (${duration}ms): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 根據用戶 ID 分頁查詢 EPUB 任務
   * 🆕 進一步優化性能
   */
  async findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PagedResult<EpubJob>> {
    const startTime = Date.now();
    const cacheKey = `findByUserIdPaginated:${userId}:${page}:${limit}`;

    // 參數驗證
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('用戶ID不能為空');
    }

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    const trimmedUserId = userId.trim();

    try {
      // 🆕 檢查緩存（只緩存第一頁）
      if (page === 1) {
        const cachedResult =
          this.getCachedResult<PagedResult<EpubJob>>(cacheKey);
        if (cachedResult) {
          this.logger.debug(
            `緩存命中 - findByUserIdPaginated: user ${trimmedUserId}, page ${page}`,
          );
          return cachedResult;
        }
      }

      this.logger.debug(
        `查詢用戶 ${trimmedUserId} 的任務，頁數: ${page}, 限制: ${limit}`,
      );

      // 🆕 優化：使用 QueryBuilder 進行更精確的查詢控制
      const queryBuilder = this.repository
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.novel', 'novel')
        .where('job.userId = :userId', { userId: trimmedUserId })
        .andWhere('job.createdAt > :cutoffDate', {
          cutoffDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6個月內
        })
        .orderBy('job.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      // 🆕 優化：並行執行查詢和計數
      const [entities, total] = await Promise.all([
        queryBuilder.getMany(),
        queryBuilder.getCount(),
      ]);

      const duration = Date.now() - startTime;
      this.recordQueryPerformance(duration, 'findByUserIdPaginated');

      this.logger.debug(
        `查詢結果：找到 ${entities.length} 筆記錄，總計 ${total} 筆 (${duration}ms)`,
      );

      const items = EpubJobMapper.toDomainList(entities);
      const result = {
        items,
        total,
        page,
        limit,
        hasMore: page * limit < total,
      };

      // 🆕 緩存第一頁結果
      if (page === 1) {
        this.setCachedResult(cacheKey, result, 60000); // 1分鐘
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryPerformance(duration, 'findByUserIdPaginated');
      this.logger.error(
        `查詢用戶 ${trimmedUserId} 任務失敗 (${duration}ms): ${error.message}`,
        error.stack,
      );
      throw new Error(`查詢用戶 ${trimmedUserId} 任務失敗: ${error.message}`);
    }
  }

  /**
   * 查詢用戶最近指定天數內的任務
   */
  async findRecentByUserId(
    userId: string,
    withinDays: number,
  ): Promise<EpubJob[]> {
    const startTime = Date.now();

    // 參數驗證
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('用戶ID不能為空');
    }

    if (withinDays < 1 || withinDays > 365) {
      withinDays = 7;
    }

    const trimmedUserId = userId.trim();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - withinDays);

    try {
      this.logger.debug(
        `查詢用戶 ${trimmedUserId} 最近 ${withinDays} 天的任務，截止日期: ${cutoffDate.toISOString()}`,
      );

      // 🆕 優化：使用複合索引查詢條件
      const entities = await this.repository.find({
        where: {
          userId: trimmedUserId,
          createdAt: MoreThan(cutoffDate),
        },
        order: {
          createdAt: 'DESC',
        },
        relations: ['novel'],
        // 🆕 優化：限制最大返回數量，防止大量數據返回
        take: 50,
        // 🆕 優化：短時間緩存
        cache: 60000, // 緩存 1 分鐘
      });

      const duration = Date.now() - startTime;

      if (duration > 1000) {
        this.logger.warn(
          `慢查詢檢測 - findRecentByUserId: ${duration}ms for user ${trimmedUserId}, ${withinDays} days, found ${entities.length} records`,
        );
      }

      this.logger.debug(
        `查詢結果：找到 ${entities.length} 筆最近任務 (${duration}ms)`,
      );

      return EpubJobMapper.toDomainList(entities);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `查詢用戶 ${trimmedUserId} 最近任務失敗 (${duration}ms): ${error.message}`,
        error.stack,
      );
      throw new Error(
        `查詢用戶 ${trimmedUserId} 最近任務失敗: ${error.message}`,
      );
    }
  }

  /**
   * 查詢最近的活躍任務
   * 活躍任務定義為：在指定時間之後創建的，且狀態不是已完成或已失敗的任務
   * @param since 查詢起始時間
   */
  async findRecentActiveJobs(since: Date): Promise<EpubJob[]> {
    const startTime = Date.now();

    try {
      // 🆕 修復：正確的查詢條件，查詢指定時間之後創建的任務
      const entities = await this.repository.find({
        where: {
          createdAt: MoreThan(since), // 修復：查詢指定時間之後創建的任務
          status: Not(In([JobStatus.COMPLETED, JobStatus.FAILED])), // 排除已完成和已失敗的任務
        },
        order: {
          createdAt: 'DESC',
        },
        relations: ['novel'],
        // 🆕 優化：限制最大返回數量
        take: 100,
      });

      const duration = Date.now() - startTime;

      if (duration > 1500) {
        this.logger.warn(
          `慢查詢檢測 - findRecentActiveJobs: ${duration}ms since ${since.toISOString()}, found ${entities.length} records`,
        );
      }

      this.logger.debug(
        `查詢最近活躍任務：自 ${since.toISOString()} 起找到 ${entities.length} 筆記錄 (${duration}ms)`,
      );

      return EpubJobMapper.toDomainList(entities);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `查詢最近活躍任務失敗 (${duration}ms): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 更新 EPUB 任務狀態
   * 🆕 優化更新操作性能，添加緩存失效
   */
  async updateStatus(id: string, status: JobStatus): Promise<EpubJob> {
    const startTime = Date.now();

    try {
      // 🆕 優化：使用事務確保原子性
      const result = await this.repository.manager.transaction(
        async (manager) => {
          await manager.update(EpubJobOrmEntity, id, {
            status,
          });

          const updatedEntity = await manager.findOne(EpubJobOrmEntity, {
            where: { id },
            relations: ['novel'],
          });

          return updatedEntity;
        },
      );

      const duration = Date.now() - startTime;
      this.recordQueryPerformance(duration, 'updateStatus');

      if (!result) {
        throw new Error(`更新狀態後找不到任務: ${id}`);
      }

      // 🆕 清除相關緩存
      this.invalidateRelatedCache(id, result.userId || undefined);

      return EpubJobMapper.toDomain(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryPerformance(duration, 'updateStatus');
      this.logger.error(
        `更新任務狀態失敗 (${duration}ms): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 更新 EPUB 任務下載 URL
   * 🆕 優化更新操作性能，添加緩存失效
   */
  async updateDownloadUrl(id: string, publicUrl: string): Promise<EpubJob> {
    const startTime = Date.now();

    try {
      // 🆕 優化：使用事務確保原子性
      const result = await this.repository.manager.transaction(
        async (manager) => {
          await manager.update(EpubJobOrmEntity, id, {
            publicUrl,
          });

          const updatedEntity = await manager.findOne(EpubJobOrmEntity, {
            where: { id },
            relations: ['novel'],
          });

          return updatedEntity;
        },
      );

      const duration = Date.now() - startTime;
      this.recordQueryPerformance(duration, 'updateDownloadUrl');

      if (!result) {
        throw new Error(`更新下載URL後找不到任務: ${id}`);
      }

      // 🆕 清除相關緩存
      this.invalidateRelatedCache(id, result.userId || undefined);

      return EpubJobMapper.toDomain(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryPerformance(duration, 'updateDownloadUrl');
      this.logger.error(
        `更新任務下載URL失敗 (${duration}ms): ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 🆕 清除相關緩存
  private invalidateRelatedCache(jobId: string, userId?: string): void {
    const keysToInvalidate: string[] = [];

    // 清除特定任務的緩存
    keysToInvalidate.push(`findById:${jobId}`);

    // 清除用戶相關的緩存
    if (userId) {
      for (const [key] of this.queryCache.entries()) {
        if (
          key.includes(`findByUserIdPaginated:${userId}`) ||
          key.includes(`findRecentByUserId:${userId}`)
        ) {
          keysToInvalidate.push(key);
        }
      }
    }

    // 清除分頁查詢緩存（第一頁）
    for (const [key] of this.queryCache.entries()) {
      if (key.startsWith('findPaged:') && key.includes('"page":1')) {
        keysToInvalidate.push(key);
      }
    }

    // 執行清除
    keysToInvalidate.forEach((key) => {
      this.queryCache.delete(key);
    });

    if (keysToInvalidate.length > 0) {
      this.logger.debug(`清除了 ${keysToInvalidate.length} 個相關緩存項目`);
    }
  }

  // 🆕 獲取性能統計
  getPerformanceStats(): {
    totalQueries: number;
    slowQueries: number;
    averageQueryTime: number;
    cacheHitRate: number;
    cacheSize: number;
  } {
    const hitRate =
      (this.performanceStats.cacheHits /
        (this.performanceStats.cacheHits + this.performanceStats.cacheMisses)) *
      100;

    return {
      totalQueries: this.performanceStats.totalQueries,
      slowQueries: this.performanceStats.slowQueries,
      averageQueryTime: this.performanceStats.averageQueryTime,
      cacheHitRate: isNaN(hitRate) ? 0 : hitRate,
      cacheSize: this.queryCache.size,
    };
  }
}

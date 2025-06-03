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

/**
 * EpubJob 儲存庫 TypeORM 實現
 * 實現 Port 接口並調用 Mapper 進行領域模型轉換
 */
@Injectable()
export class EpubJobRepositoryTypeORM implements EpubJobRepository {
  constructor(
    @InjectRepository(EpubJobOrmEntity)
    private readonly repository: TypeOrmRepository<EpubJobOrmEntity>,
  ) {}

  /**
   * 根據 ID 查找 EPUB 任務
   */
  async findById(id: string): Promise<EpubJob | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    return EpubJobMapper.toDomain(entity);
  }

  /**
   * 根據小說 ID 查找最新的 EPUB 任務
   */
  async findLatestByNovelId(novelId: string): Promise<EpubJob | null> {
    const entity = await this.repository.findOne({
      where: { novelId },
      order: { createdAt: 'DESC' },
    });
    if (!entity) {
      return null;
    }
    return EpubJobMapper.toDomain(entity);
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
    const entities = await this.repository.find({
      where: statuses.map((status) => ({ status })),
    });
    return EpubJobMapper.toDomainList(entities);
  }

  /**
   * 分頁查詢 EPUB 任務
   */
  async findPaged(options: PaginationOptions): Promise<PagedResult<EpubJob>> {
    const [entities, total] = await this.repository.findAndCount({
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      order: {
        [options.sortBy || 'createdAt']: options.sortDirection || 'DESC',
      },
    });

    const items = EpubJobMapper.toDomainList(entities);

    return {
      items,
      total,
      page: options.page,
      limit: options.limit,
      hasMore: options.page * options.limit < total,
    };
  }

  /**
   * 根據用戶 ID 分頁查詢 EPUB 任務
   */
  async findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PagedResult<EpubJob>> {
    // 參數驗證
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('用戶ID不能為空');
    }

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    const trimmedUserId = userId.trim();

    try {
      console.log(
        `[EpubJobRepository] 查詢用戶 ${trimmedUserId} 的任務，頁數: ${page}, 限制: ${limit}`,
      );

      const [entities, total] = await this.repository.findAndCount({
        where: { userId: trimmedUserId },
        skip: (page - 1) * limit,
        take: limit,
        order: {
          createdAt: 'DESC',
        },
        relations: ['novel'],
      });

      console.log(
        `[EpubJobRepository] 查詢結果：找到 ${entities.length} 筆記錄，總計 ${total} 筆`,
      );

      const items = EpubJobMapper.toDomainList(entities);

      return {
        items,
        total,
        page,
        limit,
        hasMore: page * limit < total,
      };
    } catch (error) {
      console.error(
        `[EpubJobRepository] 查詢用戶 ${trimmedUserId} 的任務失敗:`,
        error,
      );
      throw new Error(`查詢用戶 ${trimmedUserId} 的任務失敗: ${error.message}`);
    }
  }

  /**
   * 查詢用戶最近指定天數內的任務
   */
  async findRecentByUserId(
    userId: string,
    withinDays: number,
  ): Promise<EpubJob[]> {
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
      console.log(
        `[EpubJobRepository] 查詢用戶 ${trimmedUserId} 最近 ${withinDays} 天的任務，截止日期: ${cutoffDate.toISOString()}`,
      );

      const entities = await this.repository.find({
        where: {
          userId: trimmedUserId,
          createdAt: MoreThan(cutoffDate),
        },
        order: {
          createdAt: 'DESC',
        },
        relations: ['novel'],
      });

      console.log(
        `[EpubJobRepository] 查詢結果：找到 ${entities.length} 筆最近任務`,
      );

      return EpubJobMapper.toDomainList(entities);
    } catch (error) {
      console.error(
        `[EpubJobRepository] 查詢用戶 ${trimmedUserId} 最近任務失敗:`,
        error,
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
    const entities = await this.repository.find({
      where: {
        createdAt: LessThan(new Date()), // 所有已創建的任務
        status: Not(In([JobStatus.COMPLETED, JobStatus.FAILED])), // 排除已完成和已失敗的任務
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return EpubJobMapper.toDomainList(entities);
  }

  /**
   * 更新 EPUB 任務狀態
   */
  async updateStatus(id: string, status: JobStatus): Promise<EpubJob> {
    await this.repository.update(id, { status });
    const updatedEntity = await this.repository.findOne({ where: { id } });
    return EpubJobMapper.toDomain(updatedEntity!);
  }

  /**
   * 更新 EPUB 任務下載 URL
   */
  async updateDownloadUrl(id: string, publicUrl: string): Promise<EpubJob> {
    await this.repository.update(id, { publicUrl });
    const updatedEntity = await this.repository.findOne({ where: { id } });
    return EpubJobMapper.toDomain(updatedEntity!);
  }
}

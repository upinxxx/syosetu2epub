import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepository } from 'typeorm';
import {
  PagedRepository,
  PagedResult,
  PaginationOptions,
} from '@/domain/ports/repository.port.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import {
  EpubJobOrmEntity,
  EpubJobStatus,
} from '@/shared/dto/epub-job.orm-entity.js';
import { EpubJobMapper } from '@/domain/mappers/epub-job.mapper.js';

/**
 * EpubJob 儲存庫 TypeORM 實現
 * 實現 Port 接口並調用 Mapper 進行領域模型轉換
 */
@Injectable()
export class EpubJobRepositoryTypeORM implements PagedRepository<EpubJob> {
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
   * 尚未添加會員功能 先註解
   */
  // async findPagedByUserId(
  //   userId: string,
  //   options: PaginationOptions,
  // ): Promise<PagedResult<EpubJob>> {
  //   const [entities, total] = await this.repository.findAndCount({
  //     where: { userId },
  //     skip: (options.page - 1) * options.limit,
  //     take: options.limit,
  //     order: {
  //       [options.sortBy || 'createdAt']: options.sortDirection || 'DESC',
  //     },
  //   });

  //   const items = EpubJobMapper.toDomainList(entities);

  //   return {
  //     items,
  //     total,
  //     page: options.page,
  //     limit: options.limit,
  //     hasMore: options.page * options.limit < total,
  //   };
  // }

  /**
   * 更新 EPUB 任務狀態
   */
  async updateStatus(id: string, status: EpubJobStatus): Promise<EpubJob> {
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

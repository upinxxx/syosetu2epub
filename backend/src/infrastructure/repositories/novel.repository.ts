import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepository } from 'typeorm';
import {
  NovelRepository,
  PagedResult,
  PaginationOptions,
} from '@/domain/ports/repository/index.js';
import { Novel } from '@/domain/entities/novel.entity.js';
import { NovelOrmEntity } from '@/infrastructure/entities/novel.orm-entity.js';
import { NovelMapper } from '@/domain/mappers/novel.mapper.js';

/**
 * Novel 儲存庫 TypeORM 實現
 * 實現 Port 接口並調用 Mapper 進行領域模型轉換
 */
@Injectable()
export class NovelRepositoryTypeORM implements NovelRepository {
  constructor(
    @InjectRepository(NovelOrmEntity)
    private readonly repository: TypeOrmRepository<NovelOrmEntity>,
  ) {}

  /**
   * 根據 ID 查找小說
   */
  async findById(id: string): Promise<Novel | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    return NovelMapper.toDomain(entity);
  }

  /**
   * 根據來源和來源 ID 查找小說
   */
  async findBySourceAndSourceId(
    source: string,
    sourceId: string,
  ): Promise<Novel | null> {
    const entity = await this.repository.findOne({
      where: { source, sourceId },
    });
    if (!entity) {
      return null;
    }
    return NovelMapper.toDomain(entity);
  }

  /**
   * 保存小說
   */
  async save(entity: Novel): Promise<Novel> {
    const persistenceEntity = NovelMapper.toPersistence(entity);
    const savedEntity = await this.repository.save(persistenceEntity);
    return NovelMapper.toDomain(savedEntity);
  }

  /**
   * 刪除小說
   */
  async delete(entity: Novel): Promise<void> {
    await this.repository.delete(entity.id);
  }

  /**
   * 分頁查詢小說
   */
  async findPaged(options: PaginationOptions): Promise<PagedResult<Novel>> {
    const [entities, total] = await this.repository.findAndCount({
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      order: {
        [options.sortBy || 'createdAt']: options.sortDirection || 'DESC',
      },
    });

    const items = NovelMapper.toDomainList(entities);

    return {
      items,
      total,
      page: options.page,
      limit: options.limit,
      hasMore: options.page * options.limit < total,
    };
  }

  /**
   * 更新小說信息
   */
  async update(novel: Novel): Promise<Novel> {
    const persistenceEntity = NovelMapper.toPersistence(novel);
    await this.repository.update(novel.id, persistenceEntity);
    const updatedEntity = await this.repository.findOne({
      where: { id: novel.id },
    });
    if (!updatedEntity) {
      throw new Error(`Novel with id ${novel.id} not found after update`);
    }
    return NovelMapper.toDomain(updatedEntity);
  }
}

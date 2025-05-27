import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepository } from 'typeorm';
import {
  PagedResult,
  PagedUserRepository,
  PaginationOptions,
} from '@/domain/ports/repository.port.js';
import { User } from '@/domain/entities/user.entity.js';
import { UserOrmEntity } from '@/infrastructure/entities/user.orm-entity.js';
import { UserMapper } from '@/domain/mappers/user.mapper.js';

/**
 * User 儲存庫 TypeORM 實現
 * 實現 Port 接口並調用 Mapper 進行領域模型轉換
 */
@Injectable()
export class UserRepositoryTypeORM implements PagedUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repository: TypeOrmRepository<UserOrmEntity>,
  ) {}

  /**
   * 根據 ID 查找用戶
   */
  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    return UserMapper.toDomain(entity);
  }

  /**
   * 根據電子郵件查找用戶
   */
  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { email },
    });
    if (!entity) {
      return null;
    }
    return UserMapper.toDomain(entity);
  }

  /**
   * 根據 Google ID 查找用戶
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { googleId },
    });
    if (!entity) {
      return null;
    }
    return UserMapper.toDomain(entity);
  }

  /**
   * 保存用戶
   */
  async save(entity: User): Promise<User> {
    const persistenceEntity = UserMapper.toPersistence(entity);
    const savedEntity = await this.repository.save(persistenceEntity);
    return UserMapper.toDomain(savedEntity);
  }

  /**
   * 刪除用戶
   */
  async delete(entity: User): Promise<void> {
    await this.repository.delete(entity.id);
  }

  /**
   * 更新用戶
   */
  async update(user: User): Promise<User> {
    const persistenceEntity = UserMapper.toPersistence(user);
    await this.repository.update(user.id, persistenceEntity);
    const updatedEntity = await this.repository.findOne({
      where: { id: user.id },
    });
    if (!updatedEntity) {
      throw new Error(`User with id ${user.id} not found after update`);
    }
    return UserMapper.toDomain(updatedEntity);
  }

  /**
   * 分頁查詢用戶
   */
  async findPaged(options: PaginationOptions): Promise<PagedResult<User>> {
    const [entities, total] = await this.repository.findAndCount({
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      order: options.sortBy
        ? { [options.sortBy]: options.sortDirection || 'ASC' }
        : undefined,
    });

    const items = UserMapper.toDomainList(entities);
    const hasMore =
      (options.page - 1) * options.limit + entities.length < total;

    return {
      items,
      total,
      page: options.page,
      limit: options.limit,
      hasMore,
    };
  }

  /**
   * 創建新的 ORM 實體
   */
  create(entityData: Partial<UserOrmEntity>): UserOrmEntity {
    return this.repository.create(entityData);
  }
}

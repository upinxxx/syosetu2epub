import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepository } from 'typeorm';
import {
  PagedRepository,
  PagedResult,
  PaginationOptions,
} from '@/domain/ports/repository.port.js';
import { EmailLog } from '@/domain/entities/email-log.entity.js';
import { EmailLogOrmEntity } from '@/infrastructure/entities/email-log.orm-entity.js';
import { EmailLogMapper } from '@/domain/mappers/email-log.mapper.js';

/**
 * EmailLog 儲存庫 TypeORM 實現
 * 實現 Port 接口並調用 Mapper 進行領域模型轉換
 */
@Injectable()
export class EmailLogRepositoryTypeORM implements PagedRepository<EmailLog> {
  constructor(
    @InjectRepository(EmailLogOrmEntity)
    private readonly repository: TypeOrmRepository<EmailLogOrmEntity>,
  ) {}

  /**
   * 根據 ID 查找電子郵件日誌
   */
  async findById(id: string): Promise<EmailLog | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    return EmailLogMapper.toDomain(entity);
  }

  /**
   * 保存電子郵件日誌
   */
  async save(entity: EmailLog): Promise<EmailLog> {
    const persistenceEntity = EmailLogMapper.toPersistence(entity);
    const savedEntity = await this.repository.save(persistenceEntity);
    return EmailLogMapper.toDomain(savedEntity);
  }

  /**
   * 刪除電子郵件日誌
   */
  async delete(entity: EmailLog): Promise<void> {
    await this.repository.delete(entity.id);
  }

  /**
   * 分頁查詢電子郵件日誌
   */
  async findPaged(options: PaginationOptions): Promise<PagedResult<EmailLog>> {
    const [entities, total] = await this.repository.findAndCount({
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      order: {
        [options.sortBy || 'createdAt']: options.sortDirection || 'DESC',
      },
    });

    const items = EmailLogMapper.toDomainList(entities);

    return {
      items,
      total,
      page: options.page,
      limit: options.limit,
      hasMore: options.page * options.limit < total,
    };
  }

  /**
   * 根據收件人電子郵件地址查找日誌
   */
  async findByRecipientEmail(email: string): Promise<EmailLog[]> {
    const entities = await this.repository.find({
      where: { recipientEmail: email },
      order: { createdAt: 'DESC' },
    });
    return EmailLogMapper.toDomainList(entities);
  }

  /**
   * 根據用戶 ID 查找所有電子郵件日誌
   */
  async findByUserId(userId: string): Promise<EmailLog[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return EmailLogMapper.toDomainList(entities);
  }
}

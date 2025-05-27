import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepository } from 'typeorm';
import { KindleDeliveryOrmEntity } from '../entities/kindle-delivery.orm-entity.js';
import { KindleDelivery } from '@/domain/entities/kindle-delivery.entity.js';
import { KindleDeliveryRepository } from '@/domain/ports/repository/index.js';
import { KindleDeliveryMapper } from '@/domain/mappers/kindle-delivery.mapper.js';

/**
 * Kindle 交付儲存庫實現
 */
@Injectable()
export class KindleDeliveryRepositoryImpl implements KindleDeliveryRepository {
  constructor(
    @InjectRepository(KindleDeliveryOrmEntity)
    private readonly kindleDeliveryRepository: TypeOrmRepository<KindleDeliveryOrmEntity>,
  ) {}

  /**
   * 保存 Kindle 交付
   */
  async save(entity: KindleDelivery): Promise<KindleDelivery> {
    const ormEntity = KindleDeliveryMapper.toPersistence(entity);
    const savedEntity = await this.kindleDeliveryRepository.save(ormEntity);
    return KindleDeliveryMapper.toDomain(savedEntity);
  }

  /**
   * 根據 ID 查找 Kindle 交付
   */
  async findById(id: string): Promise<KindleDelivery | null> {
    const ormEntity = await this.kindleDeliveryRepository.findOne({
      where: { id },
      relations: ['epubJob', 'user'],
    });

    if (!ormEntity) {
      return null;
    }

    return KindleDeliveryMapper.toDomain(ormEntity);
  }

  /**
   * 根據 EPUB 任務 ID 查找 Kindle 交付
   */
  async findByEpubJobId(epubJobId: string): Promise<KindleDelivery[]> {
    const ormEntities = await this.kindleDeliveryRepository.find({
      where: { epubJobId },
      relations: ['epubJob', 'user'],
    });

    return KindleDeliveryMapper.toDomainList(ormEntities);
  }

  /**
   * 根據使用者 ID 查找 Kindle 交付
   */
  async findByUserId(userId: string): Promise<KindleDelivery[]> {
    const ormEntities = await this.kindleDeliveryRepository.find({
      where: { userId },
      relations: ['epubJob', 'user'],
    });

    return KindleDeliveryMapper.toDomainList(ormEntities);
  }

  /**
   * 根據使用者 ID 分頁查詢 Kindle 交付
   */
  async findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: KindleDelivery[];
    totalItems: number;
    totalPages: number;
  }> {
    const [ormEntities, totalItems] =
      await this.kindleDeliveryRepository.findAndCount({
        where: { userId },
        relations: ['epubJob', 'epubJob.novel', 'user'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: KindleDeliveryMapper.toDomainList(ormEntities),
      totalItems,
      totalPages,
    };
  }

  /**
   * 刪除 Kindle 交付
   */
  async delete(entity: KindleDelivery): Promise<void> {
    await this.kindleDeliveryRepository.delete(entity.id);
  }
}

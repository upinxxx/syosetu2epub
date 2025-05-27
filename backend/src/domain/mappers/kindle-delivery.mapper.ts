import { KindleDelivery } from '../entities/kindle-delivery.entity.js';
import { KindleDeliveryOrmEntity } from '@/infrastructure/entities/kindle-delivery.orm-entity.js';
import { EpubJobMapper } from './epub-job.mapper.js';
import { UserMapper } from './user.mapper.js';
import { DeliveryStatus } from '../enums/delivery-status.enum.js';

/**
 * Kindle 交付 Mapper
 * 負責在領域實體和 ORM 實體之間進行轉換
 */
export class KindleDeliveryMapper {
  /**
   * 將領域實體轉換為 ORM 實體
   */
  public static toPersistence(
    domainEntity: KindleDelivery,
  ): KindleDeliveryOrmEntity {
    const ormEntity = new KindleDeliveryOrmEntity();

    ormEntity.id = domainEntity.id;
    ormEntity.epubJobId = domainEntity.epubJobId;
    ormEntity.userId = domainEntity.userId;
    ormEntity.toEmail = domainEntity.toEmail;
    ormEntity.status = domainEntity.status;
    ormEntity.errorMessage = domainEntity.errorMessage || null;
    ormEntity.sentAt = domainEntity.sentAt || null;
    ormEntity.createdAt = domainEntity.createdAt;
    ormEntity.updatedAt = domainEntity.updatedAt;

    return ormEntity;
  }

  /**
   * 將 ORM 實體轉換為領域實體
   */
  public static toDomain(ormEntity: KindleDeliveryOrmEntity): KindleDelivery {
    const epubJob = ormEntity.epubJob
      ? EpubJobMapper.toDomain(ormEntity.epubJob)
      : undefined;
    const user = ormEntity.user
      ? UserMapper.toDomain(ormEntity.user)
      : undefined;

    return KindleDelivery.reconstitute({
      id: ormEntity.id,
      epubJobId: ormEntity.epubJobId,
      userId: ormEntity.userId,
      toEmail: ormEntity.toEmail,
      status: ormEntity.status as DeliveryStatus,
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
      epubJob,
      user,
      errorMessage: ormEntity.errorMessage || undefined,
      sentAt: ormEntity.sentAt || undefined,
    });
  }

  /**
   * 將多個 ORM 實體轉換為領域實體
   */
  public static toDomainList(
    ormEntities: KindleDeliveryOrmEntity[],
  ): KindleDelivery[] {
    return ormEntities.map((ormEntity) => this.toDomain(ormEntity));
  }
}

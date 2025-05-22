import { Novel } from '../entities/novel.entity.js';
import { NovelOrmEntity } from '@/infrastructure/entities/novel.orm-entity.js';

/**
 * 小說 Mapper
 * 負責在領域實體和 ORM 實體之間進行轉換
 */
export class NovelMapper {
  /**
   * 將領域實體轉換為 ORM 實體
   */
  public static toPersistence(domainEntity: Novel): NovelOrmEntity {
    const ormEntity = new NovelOrmEntity();

    ormEntity.id = domainEntity.id;
    ormEntity.source = domainEntity.source;
    ormEntity.sourceId = domainEntity.sourceId;
    ormEntity.title = domainEntity.title;

    // 處理可選屬性
    if (domainEntity.author) {
      ormEntity.author = domainEntity.author;
    }

    if (domainEntity.description) {
      ormEntity.description = domainEntity.description;
    }

    if (domainEntity.coverUrl) {
      ormEntity.coverUrl = domainEntity.coverUrl;
    }

    ormEntity.createdAt = domainEntity.createdAt;

    if (domainEntity.novelUpdatedAt) {
      ormEntity.novelUpdatedAt = domainEntity.novelUpdatedAt;
    }

    return ormEntity;
  }

  /**
   * 將 ORM 實體轉換為領域實體
   */
  public static toDomain(ormEntity: NovelOrmEntity): Novel {
    return Novel.reconstitute(
      ormEntity.id,
      ormEntity.source,
      ormEntity.sourceId,
      ormEntity.title,
      ormEntity.createdAt,
      ormEntity.author,
      ormEntity.description,
      ormEntity.coverUrl,
      ormEntity.novelUpdatedAt,
    );
  }

  /**
   * 將多個 ORM 實體轉換為領域實體
   */
  public static toDomainList(ormEntities: NovelOrmEntity[]): Novel[] {
    return ormEntities.map((ormEntity) => this.toDomain(ormEntity));
  }
}

import { User } from '../entities/user.entity.js';
import { UserOrmEntity } from '@/infrastructure/entities/user.orm-entity.js';

/**
 * 使用者 Mapper
 * 負責在領域實體和 ORM 實體之間進行轉換
 */
export class UserMapper {
  /**
   * 將領域實體轉換為 ORM 實體
   */
  public static toPersistence(domainEntity: User): UserOrmEntity {
    const ormEntity = new UserOrmEntity();

    ormEntity.id = domainEntity.id;
    ormEntity.googleId = domainEntity.googleId;
    ormEntity.email = domainEntity.email;
    ormEntity.displayName = domainEntity.displayName;
    ormEntity.kindleEmail = domainEntity.kindleEmail || null;
    ormEntity.dailyEmailQuota = domainEntity.dailyEmailQuota;
    ormEntity.createdAt = domainEntity.createdAt;

    // 處理可選屬性
    if (domainEntity.lastLoginAt) {
      ormEntity.lastLoginAt = domainEntity.lastLoginAt;
    }

    return ormEntity;
  }

  /**
   * 將 ORM 實體轉換為領域實體
   */
  public static toDomain(ormEntity: UserOrmEntity): User {
    return User.reconstitute(
      ormEntity.id,
      ormEntity.googleId,
      ormEntity.email,
      ormEntity.displayName,
      ormEntity.createdAt,
      ormEntity.dailyEmailQuota,
      ormEntity.kindleEmail || undefined,
      ormEntity.lastLoginAt,
    );
  }

  /**
   * 將多個 ORM 實體轉換為領域實體
   */
  public static toDomainList(ormEntities: UserOrmEntity[]): User[] {
    return ormEntities.map((ormEntity) => this.toDomain(ormEntity));
  }
}

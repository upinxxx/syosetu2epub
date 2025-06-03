import { EpubJob } from '../entities/epub-job.entity.js';
import { EpubJobOrmEntity } from '@/infrastructure/entities/epub-job.orm-entity.js';
import { NovelMapper } from './novel.mapper.js';
import { Novel } from '../entities/novel.entity.js';
import { User } from '../entities/user.entity.js';
import { UserMapper } from './user.mapper.js';
import { JobStatus } from '../enums/job-status.enum.js';

/**
 * EPUB 任務 Mapper
 * 負責在領域實體和 ORM 實體之間進行轉換
 */
export class EpubJobMapper {
  /**
   * 將領域實體轉換為 ORM 實體
   */
  public static toPersistence(domainEntity: EpubJob): EpubJobOrmEntity {
    const ormEntity = new EpubJobOrmEntity();

    ormEntity.id = domainEntity.id;
    ormEntity.novelId = domainEntity.novelId;
    ormEntity.status = domainEntity.status;

    // 統一處理：領域實體的 userId 已經是 string | null，直接賦值
    ormEntity.userId = domainEntity.userId;

    // 處理可選屬性
    if (domainEntity.publicUrl) {
      ormEntity.publicUrl = domainEntity.publicUrl;
    }

    if (domainEntity.errorMessage) {
      ormEntity.errorMessage = domainEntity.errorMessage;
    }

    ormEntity.createdAt = domainEntity.createdAt;

    if (domainEntity.completedAt) {
      ormEntity.completedAt = domainEntity.completedAt;
    }

    if (domainEntity.startedAt) {
      ormEntity.startedAt = domainEntity.startedAt;
    }

    return ormEntity;
  }

  /**
   * 將 ORM 實體轉換為領域實體
   */
  public static toDomain(ormEntity: EpubJobOrmEntity): EpubJob {
    let novel: Novel | undefined = undefined;
    let user: User | undefined = undefined;

    // 如果 ORM 實體包含 novel 關聯，則轉換為領域實體
    if (ormEntity.novel) {
      novel = NovelMapper.toDomain(ormEntity.novel);
    }

    // 如果 ORM 實體包含 user 關聯，則轉換為領域實體
    if (ormEntity.user) {
      user = UserMapper.toDomain(ormEntity.user);
    }

    return EpubJob.reconstitute({
      id: ormEntity.id,
      novelId: ormEntity.novelId,
      status: ormEntity.status as JobStatus,
      createdAt: ormEntity.createdAt,
      novel,
      // 統一處理：ORM 的 userId 是 string | null，直接傳遞
      userId: ormEntity.userId,
      user,
      publicUrl: ormEntity.publicUrl,
      errorMessage: ormEntity.errorMessage,
      completedAt: ormEntity.completedAt,
      startedAt: ormEntity.startedAt,
    });
  }

  /**
   * 將多個 ORM 實體轉換為領域實體
   */
  public static toDomainList(ormEntities: EpubJobOrmEntity[]): EpubJob[] {
    return ormEntities.map((ormEntity) => this.toDomain(ormEntity));
  }
}

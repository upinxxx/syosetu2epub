import { EmailLog, EmailLogStatus } from '../entities/email-log.entity.js';
import { EmailLogOrmEntity } from '@/infrastructure/entities/email-log.orm-entity.js';
import { UserMapper } from './user.mapper.js';
import { EpubJobMapper } from './epub-job.mapper.js';

/**
 * 郵件日誌 Mapper
 * 負責在領域實體和 ORM 實體之間進行轉換
 */
export class EmailLogMapper {
  /**
   * 將領域實體轉換為 ORM 實體
   */
  public static toPersistence(domainEntity: EmailLog): EmailLogOrmEntity {
    const ormEntity = new EmailLogOrmEntity();

    ormEntity.id = domainEntity.id;
    ormEntity.toEmail = domainEntity.toEmail;
    ormEntity.status = domainEntity.status;
    ormEntity.sentAt = domainEntity.sentAt;

    // 處理可選屬性
    if (domainEntity.errorMessage) {
      ormEntity.errorMessage = domainEntity.errorMessage;
    }

    if (domainEntity.ip) {
      ormEntity.ip = domainEntity.ip;
    }

    // 關聯需要在儲存庫層處理

    return ormEntity;
  }

  /**
   * 將 ORM 實體轉換為領域實體
   */
  public static toDomain(ormEntity: EmailLogOrmEntity): EmailLog {
    let user = undefined;
    let epubJob = undefined;

    // 如果 ORM 實體包含關聯，則轉換為領域實體
    if (ormEntity.user) {
      user = UserMapper.toDomain(ormEntity.user);
    }

    if (ormEntity.epubJob) {
      epubJob = EpubJobMapper.toDomain(ormEntity.epubJob);
    }

    return EmailLog.reconstitute(
      ormEntity.id,
      ormEntity.user?.id,
      ormEntity.epubJob?.id,
      ormEntity.toEmail,
      ormEntity.status as EmailLogStatus,
      ormEntity.sentAt,
      user,
      epubJob,
      ormEntity.errorMessage,
      ormEntity.ip,
    );
  }

  /**
   * 將多個 ORM 實體轉換為領域實體
   */
  public static toDomainList(ormEntities: EmailLogOrmEntity[]): EmailLog[] {
    return ormEntities.map((ormEntity) => this.toDomain(ormEntity));
  }
}

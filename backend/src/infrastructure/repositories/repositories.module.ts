import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NovelOrmEntity } from '../entities/novel.orm-entity.js';
import { EpubJobOrmEntity } from '../../shared/dto/epub-job.orm-entity.js';
import { UserOrmEntity } from '../entities/user.orm-entity.js';
import { EmailLogOrmEntity } from '../entities/email-log.orm-entity.js';

import { NovelRepositoryTypeORM } from './novel-repository.adapter.js';
import { EpubJobRepositoryTypeORM } from './epub-job-repository.adapter.js';
import { UserRepositoryTypeORM } from './user-repository.adapter.js';
import { EmailLogRepositoryTypeORM } from './email-log-repository.adapter.js';

// 定義提供者令牌
export const NOVEL_REPOSITORY_TOKEN = 'NOVEL_REPOSITORY';
export const EPUB_JOB_REPOSITORY_TOKEN = 'EPUB_JOB_REPOSITORY';
export const USER_REPOSITORY_TOKEN = 'USER_REPOSITORY';
export const EMAIL_LOG_REPOSITORY_TOKEN = 'EMAIL_LOG_REPOSITORY';

/**
 * 儲存庫模組
 * 提供對所有儲存庫的訪問
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      NovelOrmEntity,
      EpubJobOrmEntity,
      UserOrmEntity,
      EmailLogOrmEntity,
    ]),
  ],
  providers: [
    {
      provide: NOVEL_REPOSITORY_TOKEN,
      useClass: NovelRepositoryTypeORM,
    },
    {
      provide: EPUB_JOB_REPOSITORY_TOKEN,
      useClass: EpubJobRepositoryTypeORM,
    },
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: UserRepositoryTypeORM,
    },
    {
      provide: EMAIL_LOG_REPOSITORY_TOKEN,
      useClass: EmailLogRepositoryTypeORM,
    },
  ],
  exports: [
    NOVEL_REPOSITORY_TOKEN,
    EPUB_JOB_REPOSITORY_TOKEN,
    USER_REPOSITORY_TOKEN,
    EMAIL_LOG_REPOSITORY_TOKEN,
  ],
})
export class RepositoriesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NovelOrmEntity } from '../entities/novel.orm-entity.js';
import { EpubJobOrmEntity } from '../entities/epub-job.orm-entity.js';
import { UserOrmEntity } from '../entities/user.orm-entity.js';
import { KindleDeliveryOrmEntity } from '../entities/kindle-delivery.orm-entity.js';

import { NovelRepositoryTypeORM } from './novel-repository.adapter.js';
import { EpubJobRepositoryTypeORM } from './epub-job-repository.adapter.js';
import { UserRepositoryTypeORM } from './user-repository.adapter.js';
import { KindleDeliveryRepositoryImpl } from './kindle-delivery.repository.js';

// 導入 Domain 層定義的 Token
import {
  NOVEL_REPOSITORY_TOKEN,
  EPUB_JOB_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
  KINDLE_DELIVERY_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';

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
      KindleDeliveryOrmEntity,
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
      provide: KINDLE_DELIVERY_REPOSITORY_TOKEN,
      useClass: KindleDeliveryRepositoryImpl,
    },
  ],
  exports: [
    NOVEL_REPOSITORY_TOKEN,
    EPUB_JOB_REPOSITORY_TOKEN,
    USER_REPOSITORY_TOKEN,
    KINDLE_DELIVERY_REPOSITORY_TOKEN,
  ],
})
export class RepositoriesModule {}

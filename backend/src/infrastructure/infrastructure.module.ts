import { Module } from '@nestjs/common';
import { RepositoriesModule } from './repositories/repositories.module.js';
import { CrawlerModule } from './crawler/crawler.module.js';
import { PreviewProviderModule } from './preview-provider/preview-provider.module.js';
import { StorageModule } from './storage/storage.module.js';
import { EpubGeneratorModule } from './epub-generator/epub-generator.module.js';
import { QueueModule } from './queue/queue.module.js';
import { AuthModule } from './auth/auth.module.js';
import { EmailModule } from './email/email.module.js';
import { LockModule } from './lock/lock.module.js';
/**
 * 基礎設施模組
 * 整合所有適配器實現，並提供給應用層使用
 */
@Module({
  imports: [
    EpubGeneratorModule,
    RepositoriesModule, // 數據庫儲存庫
    CrawlerModule, // 爬蟲模組
    PreviewProviderModule, // 預覽提供者
    StorageModule, // 儲存模組
    QueueModule,
    AuthModule, // 認證基礎設施模組
    EmailModule,
    LockModule, // 分佈式鎖模組
  ],
  exports: [
    EpubGeneratorModule,
    RepositoriesModule,
    CrawlerModule,
    PreviewProviderModule,
    StorageModule,
    QueueModule,
    AuthModule,
    EmailModule,
    LockModule,
  ],
})
export class InfrastructureModule {}

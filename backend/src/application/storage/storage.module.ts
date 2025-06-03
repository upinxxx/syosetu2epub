import { Module } from '@nestjs/common';
import { CleanupOldFilesUseCase } from './cleanup-old-files.use-case.js';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module.js';

/**
 * 儲存相關模組
 */
@Module({
  imports: [
    // 引入基礎設施模組
    InfrastructureModule,
  ],
  providers: [
    {
      provide: CleanupOldFilesUseCase,
      useClass: CleanupOldFilesUseCase,
    },
  ],
  exports: [CleanupOldFilesUseCase],
})
export class StorageModule {}

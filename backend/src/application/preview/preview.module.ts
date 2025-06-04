import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AddPreviewJobUseCase } from './use-cases/add-preview-job.use-case.js';
import { GetNovelPreviewUseCase } from './use-cases/get-novel-preview.use-case.js';
import { GetPreviewJobStatusUseCase } from './use-cases/get-preview-job-status.use-case.js';
import { PreviewNovelUseCase } from './use-cases/preview-novel.use-case.js';
import { ProcessPreviewUseCase } from './use-cases/process-preview-job.use-case.js';
import { PreviewFacade } from './preview.facade.js';
import { PreviewCacheService } from './services/preview-cache.service.js';
import { PreviewCacheAdapter } from '@/infrastructure/cache/preview-cache.adapter.js';
import { PREVIEW_CACHE_TOKEN } from '@/domain/ports/cache/preview-cache.port.js';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module.js';
import { RedisModule } from '@/infrastructure/redis/redis.module.js';

/**
 * 預覽相關模組
 */
@Module({
  imports: [
    // 引入基礎設施模組
    InfrastructureModule,
    // 引入 ConfigModule 以供 PreviewCacheAdapter 建立獨立連接
    ConfigModule,
    // 引入 Redis 模組以供 PreviewCacheAdapter 使用
    RedisModule,
  ],
  providers: [
    // 預覽緩存服務
    {
      provide: PreviewCacheService,
      useClass: PreviewCacheService,
    },
    // 預覽緩存適配器
    {
      provide: PREVIEW_CACHE_TOKEN,
      useClass: PreviewCacheAdapter,
    },
    // 預覽相關用例
    {
      provide: AddPreviewJobUseCase,
      useClass: AddPreviewJobUseCase,
    },
    {
      provide: GetNovelPreviewUseCase,
      useClass: GetNovelPreviewUseCase,
    },
    {
      provide: GetPreviewJobStatusUseCase,
      useClass: GetPreviewJobStatusUseCase,
    },
    {
      provide: PreviewNovelUseCase,
      useClass: PreviewNovelUseCase,
    },
    {
      provide: ProcessPreviewUseCase,
      useClass: ProcessPreviewUseCase,
    },
    // Facade
    {
      provide: PreviewFacade,
      useClass: PreviewFacade,
    },
  ],
  exports: [
    // 僅導出 Facade 和緩存服務
    PreviewFacade,
    PreviewCacheService,
  ],
})
export class PreviewModule {}

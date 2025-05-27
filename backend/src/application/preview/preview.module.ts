import { Module } from '@nestjs/common';
import { AddPreviewJobUseCase } from './use-cases/add-preview-job.use-case.js';
import { GetNovelPreviewUseCase } from './use-cases/get-novel-preview.use-case.js';
import { GetPreviewJobStatusUseCase } from './use-cases/get-preview-job-status.use-case.js';
import { PreviewNovelUseCase } from './use-cases/preview-novel.use-case.js';
import { ProcessPreviewUseCase } from './use-cases/process-preview-job.use-case.js';
import { PreviewFacade } from './preview.facade.js';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module.js';

/**
 * 預覽相關模組
 */
@Module({
  imports: [
    // 引入基礎設施模組
    InfrastructureModule,
  ],
  providers: [
    // 預覽相關用例
    AddPreviewJobUseCase,
    GetNovelPreviewUseCase,
    GetPreviewJobStatusUseCase,
    PreviewNovelUseCase,
    ProcessPreviewUseCase,
    // Facade
    PreviewFacade,
  ],
  exports: [
    // 僅導出 Facade
    PreviewFacade,
  ],
})
export class PreviewModule {}

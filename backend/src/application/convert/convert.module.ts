import { Module } from '@nestjs/common';
import { SubmitEpubJobUseCase } from './use-cases/submit-epub-job.use-case.js';
import { ProcessEpubJobUseCase } from './use-cases/process-epub-job.use-case.js';
import { GetEpubJobStatusUseCase } from './use-cases/get-epub-job-status.use-case.js';
import { GetDownloadLinkUseCase } from './use-cases/get-download-link.use-case.js';
import { GenerateEpubUseCase } from './use-cases/generate-epub.use-case.js';
import { GetUserJobHistoryUseCase } from './use-cases/get-user-job-history.use-case.js';
import { ConvertFacade } from './convert.facade.js';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module.js';

/**
 * 轉換相關模組
 * 遵循六角架構原則：僅輸出 Facade，隱藏内部 Use Case 實現
 */
@Module({
  imports: [
    // 引入基礎設施模組
    InfrastructureModule,
  ],
  providers: [
    // 轉換相關用例 (內部實現，不對外暴露)
    {
      provide: SubmitEpubJobUseCase,
      useClass: SubmitEpubJobUseCase,
    },
    {
      provide: ProcessEpubJobUseCase,
      useClass: ProcessEpubJobUseCase,
    },
    {
      provide: GetEpubJobStatusUseCase,
      useClass: GetEpubJobStatusUseCase,
    },
    {
      provide: GetDownloadLinkUseCase,
      useClass: GetDownloadLinkUseCase,
    },
    {
      provide: GenerateEpubUseCase,
      useClass: GenerateEpubUseCase,
    },
    {
      provide: GetUserJobHistoryUseCase,
      useClass: GetUserJobHistoryUseCase,
    },
    // 統一門面（唯一對外介面）
    {
      provide: ConvertFacade,
      useClass: ConvertFacade,
    },
  ],
  exports: [
    // 僅導出 Facade - 遵循六角架構原則
    // 所有轉換相關功能都通過 ConvertFacade 統一提供
    ConvertFacade,
  ],
})
export class ConvertModule {}

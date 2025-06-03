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
 */
@Module({
  imports: [
    // 引入基礎設施模組
    InfrastructureModule,
  ],
  providers: [
    // 轉換相關用例
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
    // Facade
    {
      provide: ConvertFacade,
      useClass: ConvertFacade,
    },
  ],
  exports: [
    // 僅導出 Facade
    ConvertFacade,
    // 導出用戶任務歷史查詢用例供其他模組使用
    GetUserJobHistoryUseCase,
  ],
})
export class ConvertModule {}

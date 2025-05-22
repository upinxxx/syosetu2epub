import { Module } from '@nestjs/common';
import { PreviewNovelUseCase } from './preview-novel.use-case.js';
import { SubmitJobUseCase } from './submit-job.use-case.js';
import { GenerateEpubUseCase } from './generate-epub.use-case.js';
import { ProcessJobUseCase } from './process-job.use-case.js';
import { GetJobStatusUseCase } from './get-job-status.use-case.js';
import { RepositoriesModule } from '@/infrastructure/repositories/repositories.module.js';
import { PreviewProviderModule } from '@/infrastructure/preview-provider/preview-provider.module.js';
import { CrawlerModule } from '@/infrastructure/crawler/crawler.module.js';
import { QueueModule } from '@/infrastructure/queue/queue.module.js';
import { EpubGeneratorModule } from '@/infrastructure/epub-generator/epub-generator.module.js';
import { StorageModule } from '@/infrastructure/storage/storage.module.js';
/**
 * 應用程式使用案例模組
 * 提供所有使用案例 (Use Cases)
 */
@Module({
  imports: [
    RepositoriesModule,
    PreviewProviderModule,
    CrawlerModule,
    QueueModule,
    EpubGeneratorModule,
    StorageModule,
  ],
  providers: [
    PreviewNovelUseCase,
    SubmitJobUseCase,
    GenerateEpubUseCase,
    ProcessJobUseCase,
    GetJobStatusUseCase,
  ],
  exports: [
    PreviewNovelUseCase,
    SubmitJobUseCase,
    GenerateEpubUseCase,
    ProcessJobUseCase,
    GetJobStatusUseCase,
  ],
})
export class UseCasesModule {}

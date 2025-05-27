import { Injectable, Inject } from '@nestjs/common';
import { AddPreviewJobUseCase } from './use-cases/add-preview-job.use-case.js';
import { GetNovelPreviewUseCase } from './use-cases/get-novel-preview.use-case.js';
import { GetPreviewJobStatusUseCase } from './use-cases/get-preview-job-status.use-case.js';
import { PreviewNovelUseCase } from './use-cases/preview-novel.use-case.js';
import { ProcessPreviewUseCase } from './use-cases/process-preview-job.use-case.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { PreviewNovelJobData } from '@/shared/dto/preview-novel-job-data.dto.js';

@Injectable()
export class PreviewFacade {
  constructor(
    @Inject(AddPreviewJobUseCase)
    private readonly addPreviewJob: AddPreviewJobUseCase,
    @Inject(GetNovelPreviewUseCase)
    private readonly getNovelPreview: GetNovelPreviewUseCase,
    @Inject(GetPreviewJobStatusUseCase)
    private readonly getPreviewJobStatus: GetPreviewJobStatusUseCase,
    @Inject(PreviewNovelUseCase)
    private readonly previewNovel: PreviewNovelUseCase,
    @Inject(ProcessPreviewUseCase)
    private readonly processPreviewJob: ProcessPreviewUseCase,
  ) {}

  submitPreviewJob(source: NovelSource, sourceId: string, userId?: string) {
    return this.addPreviewJob.execute(source, sourceId);
  }

  // 小說id
  getPreviewById(id: string) {
    return this.getNovelPreview.execute(id);
  }

  getJobStatus(jobId: string) {
    return this.getPreviewJobStatus.execute(jobId);
  }

  getPreviewBySource(source: NovelSource, sourceId: string) {
    return this.previewNovel.execute(source, sourceId);
  }

  processJob(jobData: PreviewNovelJobData) {
    return this.processPreviewJob.execute(jobData);
  }

  private extractSourceIdFromUrl(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }
}

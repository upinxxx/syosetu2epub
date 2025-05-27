import { Injectable } from '@nestjs/common';
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
    private readonly addPreviewJob: AddPreviewJobUseCase,
    private readonly getNovelPreview: GetNovelPreviewUseCase,
    private readonly getPreviewJobStatus: GetPreviewJobStatusUseCase,
    private readonly previewNovel: PreviewNovelUseCase,
    private readonly processPreviewJob: ProcessPreviewUseCase,
  ) {}

  submitPreviewJob(novelId: string, userId?: string) {
    return this.addPreviewJob.execute(novelId, userId);
  }

  getPreview(jobId: string) {
    return this.getNovelPreview.execute(jobId);
  }

  getJobStatus(jobId: string) {
    return this.getPreviewJobStatus.execute(jobId);
  }

  previewNovelFromUrl(novelUrl: string, source: NovelSource) {
    const sourceId = this.extractSourceIdFromUrl(novelUrl);
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

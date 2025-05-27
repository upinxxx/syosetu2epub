import { Injectable } from '@nestjs/common';
import { SubmitEpubJobUseCase } from './use-cases/submit-epub-job.use-case.js';
import {
  ProcessEpubJobUseCase,
  ProcessJobData,
} from './use-cases/process-epub-job.use-case.js';
import { GetEpubJobStatusUseCase } from './use-cases/get-epub-job-status.use-case.js';
import { GetDownloadLinkUseCase } from './use-cases/get-download-link.use-case.js';
import { GenerateEpubUseCase } from './use-cases/generate-epub.use-case.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';

@Injectable()
export class ConvertFacade {
  constructor(
    private readonly submitEpubJob: SubmitEpubJobUseCase,
    private readonly processEpubJob: ProcessEpubJobUseCase,
    private readonly getEpubJobStatus: GetEpubJobStatusUseCase,
    private readonly getDownloadLink: GetDownloadLinkUseCase,
    private readonly generateEpub: GenerateEpubUseCase,
  ) {}

  submitJob(novelId: string, userId?: string) {
    return this.submitEpubJob.execute(novelId, userId);
  }

  processJob(jobData: ProcessJobData) {
    return this.processEpubJob.execute(jobData);
  }

  getJobStatus(jobId: string) {
    return this.getEpubJobStatus.execute(jobId);
  }

  getDownloadUrl(jobId: string) {
    return this.getDownloadLink.execute(jobId);
  }

  generateEpubFile(novelUrl: string, source: NovelSource) {
    return this.generateEpub.execute(novelUrl, source);
  }
}

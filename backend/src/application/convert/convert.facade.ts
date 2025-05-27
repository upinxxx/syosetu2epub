import { Inject, Injectable, Logger } from '@nestjs/common';
import { SubmitEpubJobUseCase } from './use-cases/submit-epub-job.use-case.js';
import {
  ProcessEpubJobUseCase,
  ProcessJobData,
} from './use-cases/process-epub-job.use-case.js';
import { GetEpubJobStatusUseCase } from './use-cases/get-epub-job-status.use-case.js';
import { GetDownloadLinkUseCase } from './use-cases/get-download-link.use-case.js';
import { GenerateEpubUseCase } from './use-cases/generate-epub.use-case.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';

/**
 * 轉換功能門面
 * 向外提供轉換相關的功能，隱藏內部實現細節
 */
@Injectable()
export class ConvertFacade {
  private readonly logger = new Logger(ConvertFacade.name);

  constructor(
    @Inject(SubmitEpubJobUseCase)
    private readonly submitEpubJob: SubmitEpubJobUseCase,
    @Inject(ProcessEpubJobUseCase)
    private readonly processEpubJob: ProcessEpubJobUseCase,
    @Inject(GetEpubJobStatusUseCase)
    private readonly getEpubJobStatus: GetEpubJobStatusUseCase,
    @Inject(GetDownloadLinkUseCase)
    private readonly getDownloadLink: GetDownloadLinkUseCase,
    @Inject(GenerateEpubUseCase)
    private readonly generateEpub: GenerateEpubUseCase,
  ) {}

  /**
   * 提交轉換任務
   * @param novelId 小說ID
   * @param userInfo 用戶信息對象 (來自身份驗證)
   */
  submitJob(novelId: string, userInfo: any) {
    this.logger.log(
      `準備提交轉換任務: ${novelId}, 用戶信息: ${JSON.stringify(userInfo || 'anonymous')}`,
    );

    // 匿名用戶處理 - 注意與 JWT 策略的區別
    if (!userInfo || !userInfo.sub) {
      this.logger.log('匿名用戶提交轉換任務，不傳遞用戶 ID');
      // 明確傳遞 null 給 Use Case
      return this.submitEpubJob.execute(novelId, null);
    }

    // 已登入用戶 - 確保 userId 有效
    if (typeof userInfo.sub === 'string' && userInfo.sub.trim() !== '') {
      const userId = userInfo.sub;
      this.logger.log(`已識別登入用戶: ${userId}`);
      return this.submitEpubJob.execute(novelId, userId);
    }

    // 未識別的情況也作為匿名處理
    this.logger.warn('無法識別的用戶類型，當作匿名處理');
    return this.submitEpubJob.execute(novelId, null);
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

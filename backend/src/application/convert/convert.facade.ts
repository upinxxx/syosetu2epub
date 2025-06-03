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

    // 提取用戶ID的統一邏輯
    const userId = this.extractUserId(userInfo);

    if (userId === null) {
      this.logger.log('匿名用戶提交轉換任務');
    } else {
      this.logger.log(`已登入用戶 ${userId} 提交轉換任務`);
    }

    return this.submitEpubJob.execute(novelId, userId);
  }

  /**
   * 統一的用戶ID提取邏輯
   * @param userInfo 來自認證策略的用戶信息
   * @returns 用戶ID (string) 或 null (匿名用戶)
   */
  private extractUserId(userInfo: any): string | null {
    this.logger.debug(
      `開始提取用戶ID，原始用戶信息: ${JSON.stringify(userInfo)}`,
    );

    // 處理 null 或 undefined 的情況（匿名用戶）
    if (!userInfo) {
      this.logger.debug('用戶信息為空，判定為匿名用戶');
      return null;
    }

    // 檢查用戶信息的類型
    if (typeof userInfo !== 'object') {
      this.logger.warn(
        `用戶信息類型異常: ${typeof userInfo}，當作匿名用戶處理`,
      );
      return null;
    }

    // 處理 JWT 策略返回的用戶對象 { sub: string, email: string }
    if (userInfo.sub && typeof userInfo.sub === 'string') {
      const userId = userInfo.sub.trim();
      if (userId !== '') {
        this.logger.debug(`從 JWT 策略提取用戶ID: ${userId}`);
        return userId;
      } else {
        this.logger.warn('JWT 策略返回的 sub 欄位為空字符串');
      }
    }

    // 處理其他可能的用戶ID欄位
    if (userInfo.id && typeof userInfo.id === 'string') {
      const userId = userInfo.id.trim();
      if (userId !== '') {
        this.logger.debug(`從 id 欄位提取用戶ID: ${userId}`);
        return userId;
      } else {
        this.logger.warn('id 欄位為空字符串');
      }
    }

    // 處理其他可能的用戶ID欄位
    if (userInfo.userId && typeof userInfo.userId === 'string') {
      const userId = userInfo.userId.trim();
      if (userId !== '') {
        this.logger.debug(`從 userId 欄位提取用戶ID: ${userId}`);
        return userId;
      } else {
        this.logger.warn('userId 欄位為空字符串');
      }
    }

    // 如果無法提取有效的用戶ID，記錄詳細警告並當作匿名用戶處理
    this.logger.warn(
      `無法從用戶信息中提取有效的用戶ID，當作匿名用戶處理。` +
        `用戶信息結構: ${JSON.stringify(userInfo)}，` +
        `可用欄位: ${Object.keys(userInfo).join(', ')}`,
    );
    return null;
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

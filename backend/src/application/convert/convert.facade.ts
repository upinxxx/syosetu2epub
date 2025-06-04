import { Inject, Injectable } from '@nestjs/common';
import { SubmitEpubJobUseCase } from './use-cases/submit-epub-job.use-case.js';
import {
  ProcessEpubJobUseCase,
  ProcessJobData,
} from './use-cases/process-epub-job.use-case.js';
import { GetEpubJobStatusUseCase } from './use-cases/get-epub-job-status.use-case.js';
import { GetDownloadLinkUseCase } from './use-cases/get-download-link.use-case.js';
import { GenerateEpubUseCase } from './use-cases/generate-epub.use-case.js';
import { GetUserJobHistoryUseCase } from './use-cases/get-user-job-history.use-case.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';

/**
 * 轉換功能門面
 * 向外提供轉換相關的功能，隱藏內部實現細節
 * 重構後：僅負責 Use Case 協調，移除橫切關注點
 */
@Injectable()
export class ConvertFacade {
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
    @Inject(GetUserJobHistoryUseCase)
    private readonly getUserJobHistoryUseCase: GetUserJobHistoryUseCase,
  ) {}

  /**
   * 提交轉換任務
   * @param novelId 小說ID
   * @param userInfo 用戶信息對象 (來自身份驗證)
   */
  async submitJob(novelId: string, userInfo: any) {
    // 提取用戶ID（簡化版本，複雜驗證已移至 Guard 層）
    const userId = this.extractUserId(userInfo);

    // 執行業務邏輯
    return this.submitEpubJob.execute(novelId, userId);
  }

  /**
   * 處理轉換任務
   * @param jobData 任務數據
   */
  async processJob(jobData: ProcessJobData) {
    return this.processEpubJob.execute(jobData);
  }

  /**
   * 獲取任務狀態
   * @param jobId 任務ID
   */
  async getJobStatus(jobId: string) {
    return this.getEpubJobStatus.execute(jobId);
  }

  /**
   * 獲取下載連結
   * @param jobId 任務ID
   */
  async getDownloadUrl(jobId: string) {
    return this.getDownloadLink.execute(jobId);
  }

  /**
   * 生成 EPUB 文件
   * @param novelUrl 小說URL
   * @param source 小說來源
   */
  async generateEpubFile(novelUrl: string, source: NovelSource) {
    return this.generateEpub.execute(novelUrl, source);
  }

  /**
   * 獲取用戶任務歷史
   * @param userId 用戶ID
   * @param page 頁碼
   * @param limit 每頁數量
   */
  async getUserJobHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.getUserJobHistoryUseCase.execute(userId, page, limit);
  }

  /**
   * 獲取用戶最近任務
   * @param userId 用戶ID
   * @param limit 數量限制
   */
  async getUserRecentJobs(userId: string, limit: number = 5) {
    return this.getUserJobHistoryUseCase.getRecentJobs(userId, limit);
  }

  /**
   * 簡化的用戶ID提取邏輯
   * 複雜的身份驗證邏輯已移至 Guard 層
   * @param userInfo 用戶信息
   * @returns 用戶ID或null（匿名用戶）
   */
  private extractUserId(userInfo: any): string | null {
    if (!userInfo || userInfo.anonymous === true) {
      return null;
    }

    // 按優先級提取用戶ID
    return (
      userInfo.sub || userInfo.id || userInfo.userId || userInfo.user_id || null
    );
  }
}

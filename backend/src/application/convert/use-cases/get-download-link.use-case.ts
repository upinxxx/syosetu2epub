import { Injectable, Logger, Inject } from '@nestjs/common';
import { JobStatus } from '@/domain/enums/job-status.enum.js';
import { GetEpubJobStatusUseCase } from './get-epub-job-status.use-case.js';

/**
 * 獲取下載連結 UseCase
 */
@Injectable()
export class GetDownloadLinkUseCase {
  private readonly logger = new Logger(GetDownloadLinkUseCase.name);

  constructor(
    private readonly getEpubJobStatusUseCase: GetEpubJobStatusUseCase,
  ) {}

  /**
   * 獲取下載連結
   * @param jobId 任務 ID
   * @returns 下載連結資訊
   */
  async execute(
    jobId: string,
  ): Promise<{ success: boolean; publicUrl?: string; message: string }> {
    this.logger.log(`獲取下載連結: ${jobId}`);

    try {
      // 使用 GetEpubJobStatusUseCase 獲取任務信息
      const jobStatus = await this.getEpubJobStatusUseCase.execute(jobId);

      if (jobStatus.status !== JobStatus.COMPLETED) {
        return {
          success: false,
          message: `任務 ${jobId} 尚未完成，目前狀態: ${jobStatus.status}`,
        };
      }

      if (!jobStatus.publicUrl) {
        return {
          success: false,
          message: `任務 ${jobId} 完成但沒有可用的下載連結`,
        };
      }

      return {
        success: true,
        publicUrl: jobStatus.publicUrl,
        message: '成功獲取下載連結',
      };
    } catch (error) {
      this.logger.error(`獲取下載連結失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}

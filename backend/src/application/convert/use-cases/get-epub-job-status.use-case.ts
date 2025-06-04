import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import {
  EpubJobRepository,
  EPUB_JOB_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import { QueuePort, QUEUE_PORT_TOKEN } from '@/domain/ports/queue.port.js';
import { JobStatusResponseDto } from '@/shared/dto/job-status.dto.js';
import { EpubJob } from '@/domain/entities/epub-job.entity.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * 獲取 EPUB 轉換任務狀態 UseCase
 * 🔑 增強版：實現智能狀態查詢機制，整合緩存、佇列和資料庫數據
 */
@Injectable()
export class GetEpubJobStatusUseCase {
  private readonly logger = new Logger(GetEpubJobStatusUseCase.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: EpubJobRepository,
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueAdapter: QueuePort,
  ) {}

  /**
   * 獲取 EPUB 任務狀態
   * 🔑 智能查詢策略：
   * 1. 優先從緩存獲取最新狀態
   * 2. 如果緩存不存在或過期，從佇列查詢
   * 3. 最後從資料庫獲取基礎信息
   * 4. 自動同步不一致的狀態
   * @param jobId 任務ID
   * @returns 任務狀態信息
   */
  async execute(jobId: string): Promise<JobStatusResponseDto> {
    this.logger.log(`智能狀態查詢請求 - 任務ID: ${jobId}`);

    // 嚴格的參數驗證
    if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
      const errorMsg = `無效的任務ID: ${jobId}`;
      this.logger.error(errorMsg);
      throw new Error('任務ID不能為空');
    }

    const trimmedJobId = jobId.trim();

    // 檢查任務ID格式（UUID格式）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedJobId)) {
      const errorMsg = `任務ID格式不正確: ${trimmedJobId}`;
      this.logger.error(errorMsg);
      throw new Error('任務ID格式不正確');
    }

    try {
      this.logger.debug(`開始智能查詢任務 ${trimmedJobId} 的狀態`);

      // 🔑 步驟1：從資料庫獲取基礎任務信息
      const dbJob = await this.epubJobRepository.findById(trimmedJobId);
      if (!dbJob) {
        this.logger.warn(`資料庫中找不到任務: ${trimmedJobId}`);
        throw new NotFoundException(`找不到 ID 為 ${trimmedJobId} 的任務`);
      }

      // 🔑 步驟2：從緩存獲取最新狀態
      const cachedStatus = await this.queueAdapter.getCachedJobStatus(
        'epub',
        trimmedJobId,
      );

      // 🔑 步驟3：從佇列獲取實時狀態（如果緩存不存在或需要驗證）
      let queueStatus: JobStatus | undefined;
      try {
        queueStatus = await this.queueAdapter.getJobStatus(
          'epub',
          trimmedJobId,
        );
      } catch (error) {
        this.logger.warn(
          `無法從佇列獲取任務 ${trimmedJobId} 狀態: ${error.message}`,
        );
        queueStatus = undefined;
      }

      // 🔑 步驟4：智能狀態合併和一致性檢查
      const mergedJobInfo = await this.mergeJobStatusInformation(
        dbJob,
        cachedStatus,
        queueStatus,
      );

      // 🔑 步驟5：如果發現不一致，自動同步到資料庫
      if (mergedJobInfo.needsSync) {
        await this.syncJobStatusToDatabase(dbJob, mergedJobInfo);
      }

      this.logger.log(
        `智能狀態查詢完成 - 任務 ${trimmedJobId} 狀態: ${mergedJobInfo.finalStatus}` +
          `${dbJob.novel ? `, 小說: ${dbJob.novel.title}` : ''}` +
          `${mergedJobInfo.dataSource ? `, 數據來源: ${mergedJobInfo.dataSource}` : ''}`,
      );

      return this.mapToResponseDto(dbJob, mergedJobInfo);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`智能狀態查詢失敗 - 任務 ${trimmedJobId}`, error.stack);

      // 記錄詳細的錯誤信息
      if (error instanceof Error) {
        this.logger.error(`錯誤詳情: ${error.message}`);
      }

      throw new Error(`查詢任務狀態失敗: ${error.message}`);
    }
  }

  /**
   * 🔑 智能合併任務狀態信息
   * 根據數據新鮮度和可靠性選擇最佳狀態
   */
  private async mergeJobStatusInformation(
    dbJob: EpubJob,
    cachedStatus: any,
    queueStatus?: JobStatus,
  ): Promise<{
    finalStatus: JobStatus;
    finalPublicUrl?: string;
    finalErrorMessage?: string;
    finalStartedAt?: Date;
    finalCompletedAt?: Date;
    needsSync: boolean;
    dataSource: string;
  }> {
    let finalStatus = dbJob.status;
    let finalPublicUrl = dbJob.publicUrl;
    let finalErrorMessage = dbJob.errorMessage;
    let finalStartedAt = dbJob.startedAt;
    let finalCompletedAt = dbJob.completedAt;
    let needsSync = false;
    let dataSource = 'database';

    // 優先級：佇列狀態 > 緩存狀態 > 資料庫狀態
    if (queueStatus && queueStatus !== dbJob.status) {
      // 佇列狀態是最權威的
      finalStatus = queueStatus;
      needsSync = true;
      dataSource = 'queue';

      this.logger.debug(
        `任務 ${dbJob.id} 狀態不一致 - 資料庫: ${dbJob.status}, 佇列: ${queueStatus}`,
      );

      // 當使用佇列狀態時，嘗試從緩存獲取詳細信息
      if (cachedStatus) {
        finalPublicUrl = cachedStatus.publicUrl || finalPublicUrl;
        finalErrorMessage = cachedStatus.errorMessage || finalErrorMessage;
        finalStartedAt = cachedStatus.startedAt || finalStartedAt;
        finalCompletedAt = cachedStatus.completedAt || finalCompletedAt;

        this.logger.debug(
          `任務 ${dbJob.id} 從緩存補充詳細信息 - publicUrl: ${finalPublicUrl ? '存在' : '無'}`,
        );
      }
    } else if (cachedStatus && cachedStatus.status !== dbJob.status) {
      // 緩存狀態次之
      finalStatus = cachedStatus.status as JobStatus;
      finalPublicUrl = cachedStatus.publicUrl || finalPublicUrl;
      finalErrorMessage = cachedStatus.errorMessage || finalErrorMessage;
      finalStartedAt = cachedStatus.startedAt || finalStartedAt;
      finalCompletedAt = cachedStatus.completedAt || finalCompletedAt;
      needsSync = true;
      dataSource = 'cache';

      this.logger.debug(
        `任務 ${dbJob.id} 使用緩存狀態 - 資料庫: ${dbJob.status}, 緩存: ${cachedStatus.status}`,
      );
    }

    // 如果緩存中有更詳細的信息，也要合併
    if (cachedStatus && !needsSync) {
      if (cachedStatus.publicUrl && !finalPublicUrl) {
        finalPublicUrl = cachedStatus.publicUrl;
      }
      if (cachedStatus.errorMessage && !finalErrorMessage) {
        finalErrorMessage = cachedStatus.errorMessage;
      }
      if (cachedStatus.startedAt && !finalStartedAt) {
        finalStartedAt = cachedStatus.startedAt;
      }
      if (cachedStatus.completedAt && !finalCompletedAt) {
        finalCompletedAt = cachedStatus.completedAt;
      }
    }

    return {
      finalStatus,
      finalPublicUrl,
      finalErrorMessage,
      finalStartedAt,
      finalCompletedAt,
      needsSync,
      dataSource,
    };
  }

  /**
   * 🔑 同步任務狀態到資料庫
   */
  private async syncJobStatusToDatabase(
    dbJob: EpubJob,
    mergedInfo: any,
  ): Promise<void> {
    try {
      // 如果狀態是 completed 但沒有 publicUrl，嘗試從緩存獲取
      let finalPublicUrl = mergedInfo.finalPublicUrl || dbJob.publicUrl;

      if (mergedInfo.finalStatus === JobStatus.COMPLETED && !finalPublicUrl) {
        this.logger.warn(
          `任務 ${dbJob.id} 標記為完成但缺少 publicUrl，嘗試從緩存獲取`,
        );

        const cachedStatus = await this.queueAdapter.getCachedJobStatus(
          'epub',
          dbJob.id,
        );

        if (cachedStatus?.publicUrl) {
          finalPublicUrl = cachedStatus.publicUrl;
          this.logger.log(
            `從緩存為任務 ${dbJob.id} 獲取到 publicUrl: ${finalPublicUrl}`,
          );
        } else {
          this.logger.error(
            `任務 ${dbJob.id} 已完成但無法獲取 publicUrl，跳過同步`,
          );
          return;
        }
      }

      // 建立更新後的任務實體
      const updatedJob = EpubJob.reconstitute({
        id: dbJob.id,
        novelId: dbJob.novelId,
        status: mergedInfo.finalStatus,
        createdAt: dbJob.createdAt,
        publicUrl: finalPublicUrl,
        errorMessage: mergedInfo.finalErrorMessage || dbJob.errorMessage,
        startedAt: mergedInfo.finalStartedAt || dbJob.startedAt,
        completedAt: mergedInfo.finalCompletedAt || dbJob.completedAt,
        userId: dbJob.userId, // 保持原有的 userId
      });

      await this.epubJobRepository.save(updatedJob);

      this.logger.log(
        `已同步任務 ${dbJob.id} 狀態到資料庫 - ` +
          `${dbJob.status} → ${mergedInfo.finalStatus} (來源: ${mergedInfo.dataSource})` +
          (finalPublicUrl ? `, publicUrl: ${finalPublicUrl}` : ''),
      );
    } catch (error) {
      this.logger.error(
        `同步任務 ${dbJob.id} 狀態到資料庫失敗: ${error.message}`,
        error.stack,
      );
      // 同步失敗不應影響查詢結果的返回
    }
  }

  /**
   * 將領域實體映射為回應 DTO
   * 🔑 增強版：整合合併後的狀態信息
   */
  private mapToResponseDto(
    job: EpubJob,
    mergedInfo?: any,
  ): JobStatusResponseDto {
    const finalStatus = mergedInfo?.finalStatus || job.status;

    return {
      success: true,
      jobId: job.id,
      novelId: job.novelId,
      status: finalStatus,
      createdAt: job.createdAt,
      startedAt: mergedInfo?.finalStartedAt || job.startedAt,
      completedAt: mergedInfo?.finalCompletedAt || job.completedAt,
      publicUrl: mergedInfo?.finalPublicUrl || job.publicUrl,
      errorMessage: mergedInfo?.finalErrorMessage || job.errorMessage,
      message: this.getStatusMessage(finalStatus),
      // 🔑 新增：數據來源信息（用於調試）
      ...(mergedInfo?.dataSource && {
        _debug: {
          dataSource: mergedInfo.dataSource,
          syncPerformed: mergedInfo.needsSync,
        },
      }),
    };
  }

  /**
   * 根據任務狀態獲取相應的消息
   */
  private getStatusMessage(status: string): string {
    switch (status) {
      case 'QUEUED':
        return '任務已排隊，等待處理';
      case 'PROCESSING':
        return '任務正在處理中';
      case 'COMPLETED':
        return '任務已完成';
      case 'FAILED':
        return '任務處理失敗';
      default:
        return '任務狀態未知';
    }
  }
}

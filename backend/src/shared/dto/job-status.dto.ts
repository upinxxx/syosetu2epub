import { IsUUID, IsNotEmpty } from 'class-validator';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * 查詢任務狀態請求 DTO
 */
export class JobStatusRequestDto {
  /**
   * 任務 ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsUUID()
  @IsNotEmpty({ message: '任務 ID 不能為空' })
  jobId: string;
}

/**
 * 任務狀態回應 DTO
 */
export class JobStatusResponseDto {
  /** 操作是否成功 */
  success: boolean;

  /** 任務 ID */
  jobId: string;

  /** 小說 ID */
  novelId?: string;

  /** 任務狀態 */
  status: JobStatus;

  /** 創建時間 */
  createdAt: Date;

  /** 開始處理時間 */
  startedAt?: Date;

  /** 完成時間 */
  completedAt?: Date;

  /** 公開下載 URL */
  publicUrl?: string;

  /** 錯誤訊息 */
  errorMessage?: string;

  /** 消息提示 */
  message?: string;
}

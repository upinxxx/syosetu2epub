import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * 提交任務回應 DTO
 */
export class SubmitJobResponseDto {
  /** 操作是否成功 */
  success: boolean;

  /** 任務 ID */
  jobId: string;

  /** 小說 ID */
  novelId: string;

  /** 任務狀態 */
  status: JobStatus;

  /** 創建時間 */
  createdAt: Date;

  /** 消息提示 */
  message?: string;
}

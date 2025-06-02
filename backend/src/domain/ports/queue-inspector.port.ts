import { JobStatus } from '../enums/job-status.enum.js';

/**
 * 隊列檢查器端口，用於檢查隊列中任務狀態
 */
export interface QueueInspectorPort {
  /**
   * 獲取任務狀態
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @returns 任務狀態緩存
   */
  getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatusCache | null>;
}

/**
 * 任務狀態緩存數據
 */
export interface JobStatusCache {
  /** 任務 ID */
  jobId: string;

  /** 任務狀態 */
  status: JobStatus;

  /** 任務處理開始時間 */
  startedAt?: Date;

  /** 任務完成時間 */
  completedAt?: Date;

  /** 任務公開連結 */
  publicUrl?: string;

  /** 任務錯誤訊息 */
  errorMessage?: string;

  /** 上次更新時間 */
  updatedAt?: Date;

  /** 預覽數據 */
  previewData?: any;

  /** 原始任務數據 */
  data?: any;
}

export const QUEUE_INSPECTOR_TOKEN = Symbol('QueueInspectorPort');

import { JobStatus } from '../../enums/job-status.enum.js';
import { JobData } from './queue-core.port.js';

// Port 令牌，用於依賴注入
export const QUEUE_CACHE_PORT_TOKEN = Symbol('QUEUE_CACHE_PORT');

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
  updatedAt: Date;

  /** 用戶 ID */
  userId?: string | null;

  /** 預覽數據 */
  previewData?: any;

  /** 原始任務數據 */
  data?: JobData;
}

/**
 * 佇列緩存 Port 介面
 * 負責任務狀態的緩存管理，實作終態保護邏輯
 */
export interface QueueCachePort {
  /**
   * 緩存任務狀態
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @param statusData 任務狀態數據
   * @param expireSeconds 緩存過期時間（秒），可選
   */
  cacheJobStatus(
    queueName: string,
    jobId: string,
    statusData: Partial<JobStatusCache>,
    expireSeconds?: number,
  ): Promise<void>;

  /**
   * 獲取緩存的任務狀態
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @returns 緩存的任務狀態數據，如果不存在則返回 null
   */
  getCachedJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatusCache | null>;

  /**
   * 刪除緩存的任務狀態
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   */
  removeCachedJobStatus(queueName: string, jobId: string): Promise<void>;

  /**
   * 檢查狀態是否為終態（完成或失敗）
   * @param status 任務狀態
   * @returns 如果是終態則返回 true
   */
  isTerminalState(status: JobStatus): boolean;

  /**
   * 批量獲取緩存狀態
   * @param queueName 隊列名稱
   * @param jobIds 任務 ID 列表
   * @returns 任務狀態數據對照表
   */
  batchGetCachedJobStatus(
    queueName: string,
    jobIds: string[],
  ): Promise<Map<string, JobStatusCache>>;

  /**
   * 清理過期的緩存項目
   * @param queueName 隊列名稱
   * @returns 清理的項目數量
   */
  cleanupExpiredCache(queueName: string): Promise<number>;
}

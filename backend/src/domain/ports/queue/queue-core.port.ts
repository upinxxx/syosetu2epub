import { JobStatus } from '../../enums/job-status.enum.js';

// Port 令牌，用於依賴注入
export const QUEUE_CORE_PORT_TOKEN = Symbol('QUEUE_CORE_PORT');

/**
 * 任務數據類型
 */
export type JobData = Record<string, any>;

/**
 * 任務附加選項
 */
export interface JobOptions {
  /** 任務延遲執行時間（毫秒） */
  delay?: number;

  /** 任務優先級 */
  priority?: number;

  /** 任務最大重試次數 */
  attempts?: number;

  /** 重試間隔（毫秒） */
  backoff?: number | { type: string; delay: number };

  /** 任務超時時間（毫秒） */
  timeout?: number;

  /** 任務 ID */
  jobId?: string;

  /** 任務可移除時間 */
  removeOnComplete?: boolean | number;

  /** 任務失敗時是否移除 */
  removeOnFail?: boolean | number;
}

/**
 * 佇列核心 Port 介面
 * 負責基本的任務管理操作，不包含事件處理、緩存管理或健康檢查
 */
export interface QueueCorePort {
  /**
   * 添加任務到隊列
   * @param queueName 隊列名稱
   * @param data 任務數據
   * @param options 任務選項
   * @returns 任務 ID
   */
  addJob<T extends JobData>(
    queueName: string,
    data: T,
    options?: JobOptions,
  ): Promise<string>;

  /**
   * 獲取任務狀態
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @returns 任務狀態
   */
  getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatus | undefined>;

  /**
   * 取消/移除任務
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   */
  removeJob(queueName: string, jobId: string): Promise<void>;

  /**
   * 獲取任務數據
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @returns 任務數據，如果不存在則返回 null
   */
  getJobData(queueName: string, jobId: string): Promise<JobData | null>;
}

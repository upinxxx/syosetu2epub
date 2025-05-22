// Port 令牌，用於依賴注入
export const QUEUE_PORT_TOKEN = Symbol('QUEUE_PORT');

/**
 * 任務數據類型
 */
export type JobData = Record<string, any>;

/**
 * 任務處理結果
 */
export type JobResult = Record<string, any> | void;

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
 * 隊列 Port 接口
 * 負責任務的入隊、處理等操作
 */
export interface QueuePort {
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
  getJobStatus(queueName: string, jobId: string): Promise<string | undefined>;

  /**
   * 取消任務
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   */
  removeJob(queueName: string, jobId: string): Promise<void>;
}

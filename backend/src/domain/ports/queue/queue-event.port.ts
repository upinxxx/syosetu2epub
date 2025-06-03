// Port 令牌，用於依賴注入
export const QUEUE_EVENT_PORT_TOKEN = Symbol('QUEUE_EVENT_PORT');

/**
 * 事件處理結果
 */
export interface EventHandlerResult {
  /** 處理是否成功 */
  success: boolean;

  /** 錯誤訊息 */
  error?: string;

  /** 處理時間戳記 */
  timestamp: Date;
}

/**
 * 佇列事件 Port 介面
 * 負責處理佇列事件，簡化為僅處理完成和失敗事件
 */
export interface QueueEventPort {
  /**
   * 設置事件監聽器
   * 僅設置關鍵事件監聽（completed, failed），移除 active 和 stalled
   */
  setupEventListeners(): void;

  /**
   * 處理任務完成事件
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @param result 任務結果
   */
  handleJobCompleted(
    queueName: string,
    jobId: string,
    result?: any,
  ): Promise<EventHandlerResult>;

  /**
   * 處理任務失敗事件
   * @param queueName 隊列名稱
   * @param jobId 任務 ID
   * @param error 失敗原因
   */
  handleJobFailed(
    queueName: string,
    jobId: string,
    error: string,
  ): Promise<EventHandlerResult>;

  /**
   * 停止事件監聽
   * @param queueName 隊列名稱（可選，如果未提供則停止所有監聽）
   */
  stopEventListeners(queueName?: string): Promise<void>;

  /**
   * 獲取事件處理統計
   * @param queueName 隊列名稱
   */
  getEventStats(queueName: string): Promise<{
    completedCount: number;
    failedCount: number;
    lastEventTime?: Date;
  }>;

  /**
   * 重設事件監聽器（用於錯誤恢復）
   * @param queueName 隊列名稱
   */
  resetEventListeners(queueName: string): Promise<void>;
}

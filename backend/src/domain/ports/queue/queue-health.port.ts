// Port 令牌，用於依賴注入
export const QUEUE_HEALTH_PORT_TOKEN = Symbol('QUEUE_HEALTH_PORT');

/**
 * 健康檢查報告
 */
export interface HealthReport {
  /** 檢查時間 */
  timestamp: Date;

  /** 整體健康狀態 */
  isHealthy: boolean;

  /** 各隊列詳細狀態 */
  queueStatus: Map<string, QueueStatus>;

  /** 失敗任務數量 */
  failedJobsCount: number;

  /** 待處理任務數量 */
  pendingJobsCount: number;

  /** 錯誤訊息（如果有） */
  errors: string[];
}

/**
 * 單一隊列狀態
 */
export interface QueueStatus {
  /** 隊列名稱 */
  queueName: string;

  /** 連接狀態 */
  isConnected: boolean;

  /** 等待中任務數量 */
  waitingCount: number;

  /** 處理中任務數量 */
  activeCount: number;

  /** 完成任務數量 */
  completedCount: number;

  /** 失敗任務數量 */
  failedCount: number;

  /** 上次活動時間 */
  lastActivity?: Date;
}

/**
 * 隊列指標
 */
export interface QueueMetrics {
  /** 隊列名稱 */
  queueName: string;

  /** 每分鐘處理量 */
  throughputPerMinute: number;

  /** 平均處理時間（毫秒） */
  averageProcessingTime: number;

  /** 錯誤率（百分比） */
  errorRate: number;

  /** 記憶體使用量 */
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * 佇列健康檢查 Port 介面
 * 負責監控隊列健康狀態、恢復失敗任務和收集指標
 */
export interface QueueHealthPort {
  /**
   * 執行全面健康檢查
   * @returns 健康檢查報告
   */
  performHealthCheck(): Promise<HealthReport>;

  /**
   * 檢查特定隊列狀態
   * @param queueName 隊列名稱
   * @returns 隊列狀態
   */
  checkQueueStatus(queueName: string): Promise<QueueStatus>;

  /**
   * 恢復失敗的任務
   * @param queueName 隊列名稱（可選，未提供則處理所有隊列）
   * @param maxRetries 最大重試次數
   * @returns 恢復的任務數量
   */
  recoverFailedJobs(queueName?: string, maxRetries?: number): Promise<number>;

  /**
   * 獲取隊列性能指標
   * @param queueName 隊列名稱
   * @param timeRange 時間範圍（分鐘）
   * @returns 隊列指標
   */
  getQueueMetrics(queueName: string, timeRange?: number): Promise<QueueMetrics>;

  /**
   * 清理殭屍任務（長時間停滯的任務）
   * @param queueName 隊列名稱
   * @param maxAge 最大年齡（小時）
   * @returns 清理的任務數量
   */
  cleanupStalledJobs(queueName: string, maxAge: number): Promise<number>;

  /**
   * 重新連接隊列（用於連接異常恢復）
   * @param queueName 隊列名稱
   */
  reconnectQueue(queueName: string): Promise<void>;

  /**
   * 獲取系統資源使用情況
   * @returns 系統資源指標
   */
  getSystemMetrics(): Promise<{
    redis: {
      connected: boolean;
      memory: number;
      connections: number;
    };
    nodejs: {
      memory: NodeJS.MemoryUsage;
      uptime: number;
      version: string;
    };
  }>;
}

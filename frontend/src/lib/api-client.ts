import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { debug, type ApiCallDetails } from "./debug.js";
import { ENV } from "./env.js";

// 🆕 請求去重管理器
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  // 生成請求鍵
  private getRequestKey(method: string, url: string, data?: any): string {
    const dataHash = data ? JSON.stringify(data) : "";
    return `${method.toUpperCase()}:${url}:${dataHash}`;
  }

  // 去重執行請求
  async deduplicate<T>(
    method: string,
    url: string,
    requestFn: () => Promise<T>,
    data?: any
  ): Promise<T> {
    const key = this.getRequestKey(method, url, data);

    // 如果已有相同請求在進行中，返回該請求的 Promise
    if (this.pendingRequests.has(key)) {
      debug.debug("API_DEDUP", `請求去重: ${method} ${url}`);
      return this.pendingRequests.get(key)!;
    }

    // 執行新請求
    const promise = requestFn().finally(() => {
      // 請求完成後清除記錄
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  // 清除所有待處理請求
  clear(): void {
    this.pendingRequests.clear();
  }
}

// 🆕 智能緩存管理器
class SmartCache {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private readonly defaultTTL = 30000; // 30秒默認緩存時間

  // 生成緩存鍵
  private getCacheKey(method: string, url: string, params?: any): string {
    const paramsHash = params ? JSON.stringify(params) : "";
    return `${method.toUpperCase()}:${url}:${paramsHash}`;
  }

  // 獲取緩存
  get(method: string, url: string, params?: any): any | null {
    const key = this.getCacheKey(method, url, params);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // 檢查是否過期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    debug.debug("API_CACHE", `緩存命中: ${method} ${url}`, {
      age: Date.now() - cached.timestamp,
      ttl: cached.ttl,
    });

    return cached.data;
  }

  // 設置緩存
  set(
    method: string,
    url: string,
    data: any,
    ttl?: number,
    params?: any
  ): void {
    const key = this.getCacheKey(method, url, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });

    debug.debug("API_CACHE", `緩存設置: ${method} ${url}`, {
      ttl: ttl || this.defaultTTL,
      cacheSize: this.cache.size,
    });
  }

  // 清除緩存
  clear(): void {
    this.cache.clear();
  }

  // 清除過期緩存
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // 🆕 獲取緩存大小
  get size(): number {
    return this.cache.size;
  }

  // 🆕 獲取緩存統計
  getStats(): {
    size: number;
    totalEntries: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    let expiredCount = 0;

    for (const [, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
    };
  }
}

// 🆕 請求優先級管理器
class RequestPriorityManager {
  private highPriorityQueue: Array<() => Promise<any>> = [];
  private normalPriorityQueue: Array<() => Promise<any>> = [];
  private lowPriorityQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly maxConcurrent = 6; // 最大並發請求數
  private activeRequests = 0;

  // 添加請求到隊列
  enqueue<T>(
    requestFn: () => Promise<T>,
    priority: "high" | "normal" | "low" = "normal"
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedFn = async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      switch (priority) {
        case "high":
          this.highPriorityQueue.push(wrappedFn);
          break;
        case "low":
          this.lowPriorityQueue.push(wrappedFn);
          break;
        default:
          this.normalPriorityQueue.push(wrappedFn);
      }

      this.processQueue();
    });
  }

  // 處理請求隊列
  private async processQueue(): Promise<void> {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.activeRequests < this.maxConcurrent) {
      let nextRequest: (() => Promise<any>) | undefined;

      // 優先處理高優先級請求
      if (this.highPriorityQueue.length > 0) {
        nextRequest = this.highPriorityQueue.shift();
      } else if (this.normalPriorityQueue.length > 0) {
        nextRequest = this.normalPriorityQueue.shift();
      } else if (this.lowPriorityQueue.length > 0) {
        nextRequest = this.lowPriorityQueue.shift();
      }

      if (!nextRequest) {
        break;
      }

      this.activeRequests++;
      nextRequest().finally(() => {
        this.activeRequests--;
        this.processQueue(); // 處理下一個請求
      });
    }

    this.processing = false;
  }

  // 獲取隊列狀態
  getQueueStatus(): {
    high: number;
    normal: number;
    low: number;
    active: number;
  } {
    return {
      high: this.highPriorityQueue.length,
      normal: this.normalPriorityQueue.length,
      low: this.lowPriorityQueue.length,
      active: this.activeRequests,
    };
  }

  // 🆕 清除所有隊列
  clear(): void {
    this.highPriorityQueue = [];
    this.normalPriorityQueue = [];
    this.lowPriorityQueue = [];
  }

  // 🆕 獲取總待處理請求數
  getTotalPending(): number {
    return (
      this.highPriorityQueue.length +
      this.normalPriorityQueue.length +
      this.lowPriorityQueue.length
    );
  }
}

// 🆕 智能輪詢管理器
class SmartPollingManager {
  private pollingIntervals = new Map<string, NodeJS.Timeout>();
  private pollingCallbacks = new Map<string, () => Promise<void>>();
  private pollingStats = new Map<
    string,
    {
      startTime: number;
      pollCount: number;
      lastPollTime: number;
      successCount: number;
      errorCount: number;
    }
  >();

  // 開始智能輪詢
  startPolling(
    key: string,
    callback: () => Promise<boolean>, // 返回 true 表示繼續輪詢，false 表示停止
    options: {
      initialInterval?: number;
      maxInterval?: number;
      backoffMultiplier?: number;
      maxDuration?: number;
    } = {}
  ): void {
    const {
      initialInterval = 2000,
      maxInterval = 30000,
      backoffMultiplier = 1.5,
      maxDuration = 300000, // 5分鐘
    } = options;

    // 停止現有輪詢
    this.stopPolling(key);

    let currentInterval = initialInterval;
    const startTime = Date.now();

    // 初始化統計
    this.pollingStats.set(key, {
      startTime,
      pollCount: 0,
      lastPollTime: 0,
      successCount: 0,
      errorCount: 0,
    });

    const poll = async () => {
      const stats = this.pollingStats.get(key)!;
      stats.pollCount++;
      stats.lastPollTime = Date.now();

      try {
        const shouldContinue = await callback();
        stats.successCount++;

        if (!shouldContinue) {
          this.stopPolling(key);
          return;
        }

        // 檢查是否超過最大持續時間
        if (Date.now() - startTime > maxDuration) {
          debug.warn("POLLING", `輪詢 ${key} 超過最大持續時間，自動停止`);
          this.stopPolling(key);
          return;
        }

        // 動態調整輪詢間隔
        if (stats.successCount > 3) {
          // 連續成功，可以稍微增加間隔
          currentInterval = Math.min(currentInterval * 1.1, maxInterval);
        }

        // 設置下一次輪詢
        const timeoutId = setTimeout(poll, currentInterval);
        this.pollingIntervals.set(key, timeoutId);
      } catch (error) {
        stats.errorCount++;
        debug.error("POLLING", `輪詢 ${key} 發生錯誤`, error);

        // 錯誤時使用退避策略
        currentInterval = Math.min(
          currentInterval * backoffMultiplier,
          maxInterval
        );

        // 如果錯誤太多，停止輪詢
        if (stats.errorCount > 5) {
          debug.error("POLLING", `輪詢 ${key} 錯誤過多，停止輪詢`);
          this.stopPolling(key);
          return;
        }

        // 設置下一次輪詢
        const timeoutId = setTimeout(poll, currentInterval);
        this.pollingIntervals.set(key, timeoutId);
      }
    };

    // 開始第一次輪詢
    poll();
  }

  // 停止輪詢
  stopPolling(key: string): void {
    const intervalId = this.pollingIntervals.get(key);
    if (intervalId) {
      clearTimeout(intervalId);
      this.pollingIntervals.delete(key);
    }

    const stats = this.pollingStats.get(key);
    if (stats) {
      const duration = Date.now() - stats.startTime;
      debug.info("POLLING", `停止輪詢 ${key}`, {
        duration: `${duration}ms`,
        pollCount: stats.pollCount,
        successRate: `${((stats.successCount / stats.pollCount) * 100).toFixed(
          1
        )}%`,
      });
      this.pollingStats.delete(key);
    }
  }

  // 停止所有輪詢
  stopAll(): void {
    for (const key of this.pollingIntervals.keys()) {
      this.stopPolling(key);
    }
  }

  // 獲取輪詢狀態
  getPollingStatus(): Array<{
    key: string;
    duration: number;
    pollCount: number;
    successRate: number;
  }> {
    const result: Array<{
      key: string;
      duration: number;
      pollCount: number;
      successRate: number;
    }> = [];

    for (const [key, stats] of this.pollingStats.entries()) {
      result.push({
        key,
        duration: Date.now() - stats.startTime,
        pollCount: stats.pollCount,
        successRate:
          stats.pollCount > 0
            ? (stats.successCount / stats.pollCount) * 100
            : 0,
      });
    }

    return result;
  }
}

// 🆕 網路狀態監控器
class NetworkMonitor {
  private isOnline = navigator.onLine;
  private connectionQuality: "fast" | "slow" | "offline" = "fast";
  private lastPingTime = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEventListeners();
    this.startPingMonitoring();
  }

  private setupEventListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.connectionQuality = "fast";
      debug.info("NETWORK", "網路連線恢復");
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.connectionQuality = "offline";
      debug.warn("NETWORK", "網路連線中斷");
    });
  }

  private startPingMonitoring(): void {
    this.pingInterval = setInterval(async () => {
      await this.checkConnectionQuality();
    }, 30000); // 每30秒檢查一次
  }

  private async checkConnectionQuality(): Promise<void> {
    if (!this.isOnline) {
      this.connectionQuality = "offline";
      return;
    }

    try {
      const startTime = Date.now();

      // 使用 fetch 進行簡單的連通性測試
      await fetch("/health", {
        method: "HEAD",
        cache: "no-cache",
        signal: AbortSignal.timeout(5000),
      });

      const pingTime = Date.now() - startTime;
      this.lastPingTime = pingTime;

      // 根據響應時間判斷連線品質
      if (pingTime < 1000) {
        this.connectionQuality = "fast";
      } else if (pingTime < 3000) {
        this.connectionQuality = "slow";
      } else {
        this.connectionQuality = "slow";
        debug.warn("NETWORK", `網路連線較慢: ${pingTime}ms`);
      }
    } catch (error) {
      this.connectionQuality = "offline";
      debug.error("NETWORK", "網路連通性檢查失敗", error);
    }
  }

  getNetworkStatus(): {
    isOnline: boolean;
    quality: "fast" | "slow" | "offline";
    lastPingTime: number;
  } {
    return {
      isOnline: this.isOnline,
      quality: this.connectionQuality,
      lastPingTime: this.lastPingTime,
    };
  }

  // 根據網路狀況調整請求配置
  getOptimalRequestConfig(): {
    timeout: number;
    retries: number;
    retryDelay: number;
  } {
    switch (this.connectionQuality) {
      case "fast":
        return { timeout: 10000, retries: 2, retryDelay: 1000 };
      case "slow":
        return { timeout: 30000, retries: 3, retryDelay: 2000 };
      case "offline":
        return { timeout: 5000, retries: 0, retryDelay: 0 };
      default:
        return { timeout: 15000, retries: 2, retryDelay: 1500 };
    }
  }

  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  }
}

// API 回應格式介面
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

// API 錯誤回應格式介面
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// 分頁參數介面
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// 預覽相關介面
export interface PreviewNovelDto {
  source: string;
  sourceId: string;
}

export interface NovelPreview {
  novelId: string;
  title: string;
  author: string;
  description: string;
  source: string;
  sourceId: string;
}

export interface PreviewResponse {
  success: boolean;
  cached?: boolean;
  jobId?: string;
  novelId?: string;
  preview?: NovelPreview;
  status?: string;
  message?: string;
}

// 轉檔相關介面 - 修復與後端 DTO 的匹配
export interface ConvertNovelDto {
  novelId: string;
  includeCover?: boolean;
}

// 修復：與後端 SubmitJobResponseDto 匹配
export interface ConversionResponse {
  success: boolean;
  jobId: string;
  novelId: string;
  status: string; // JobStatus enum
  createdAt: string; // ISO date string
  message?: string;
}

// 修復：與後端 JobStatusResponseDto 完全匹配
export interface ConversionStatusResponse {
  success: boolean;
  jobId: string;
  novelId?: string;
  status: string; // JobStatus enum
  createdAt: string; // ISO date string
  startedAt?: string; // ISO date string
  completedAt?: string; // ISO date string
  publicUrl?: string;
  errorMessage?: string;
  message?: string;
  // 移除前端特有的字段，因為後端不返回這些
  // progress?: number;
  // estimatedTimeRemaining?: number;
  // currentStep?: string;
}

export interface DownloadResponse {
  success: boolean;
  publicUrl?: string;
  message?: string;
}

// 用戶相關介面
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  kindleEmail?: string;
  dailyEmailQuota?: number;
  createdAt: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  kindleEmail?: string;
}

// Kindle 相關介面
export interface SendToKindleDto {
  jobId: string;
  kindleEmail: string;
}

export interface KindleDeliveryResponse {
  success: boolean;
  data?: {
    id: string;
    status: string;
    epubJobId: string;
    toEmail: string;
    createdAt: string;
  };
  message?: string;
}

export interface KindleStatusResponse {
  success: boolean;
  data?: {
    id: string;
    status: string;
    epubJobId: string;
    toEmail: string;
    errorMessage?: string;
    sentAt?: string;
    createdAt: string;
  };
  message?: string;
}

export interface KindleHistoryResponse {
  success: boolean;
  data?: {
    items: Array<{
      id: string;
      epubJob: {
        id: string;
        novel?: {
          title: string;
          author: string;
        };
      };
      toEmail: string;
      status: string;
      errorMessage?: string;
      sentAt?: string;
    }>;
    meta: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
  message?: string;
}

export interface RecentJobsResponse {
  success: boolean;
  jobs: Array<{
    id: string;
    novelId: string;
    novelTitle?: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    publicUrl?: string;
    errorMessage?: string;
  }>;
}

// 新增：用戶任務歷史響應接口
export interface UserJobHistoryResponse {
  success: boolean;
  jobs: Array<{
    id: string;
    novelId: string;
    novelTitle?: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    publicUrl?: string;
    errorMessage?: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * 統一的 API 客戶端
 * 封裝所有後端 API 調用，使用新的 v1 規範
 */
class ApiClient {
  private axios: AxiosInstance;
  // 🆕 增強的管理器
  private deduplicator = new RequestDeduplicator();
  private cache = new SmartCache();
  private priorityManager = new RequestPriorityManager();
  private pollingManager = new SmartPollingManager();
  private networkMonitor = new NetworkMonitor();

  constructor() {
    this.axios = this.createAxiosInstance();
    this.setupInterceptors();
    this.startPerformanceMonitoring();

    // 初始化調試
    debug.info("API_CLIENT", "API 客戶端初始化完成", {
      baseURL: this.axios.defaults.baseURL,
      timeout: this.axios.defaults.timeout,
      withCredentials: this.axios.defaults.withCredentials,
    });
  }

  // 🆕 創建優化的 Axios 實例
  private createAxiosInstance(): AxiosInstance {
    const networkConfig = this.networkMonitor.getOptimalRequestConfig();

    return axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: networkConfig.timeout,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
      // 🆕 連接池優化
      maxRedirects: 3,
      maxContentLength: 50 * 1024 * 1024, // 50MB
      maxBodyLength: 50 * 1024 * 1024, // 50MB
      // 🆕 Keep-Alive 支持
      httpAgent: typeof window === "undefined" ? undefined : undefined,
      httpsAgent: typeof window === "undefined" ? undefined : undefined,
    });
  }

  // 🆕 啟動性能監控
  private startPerformanceMonitoring(): void {
    // 定期清理緩存
    setInterval(() => {
      this.cache.cleanup();
    }, 60000); // 每分鐘清理一次

    // 定期報告性能統計
    setInterval(() => {
      this.reportPerformanceStats();
    }, 30000); // 每30秒報告一次

    // 定期調整網路配置
    setInterval(() => {
      this.adjustNetworkConfig();
    }, 60000); // 每分鐘調整一次
  }

  // 🆕 報告性能統計
  private reportPerformanceStats(): void {
    const queueStatus = this.priorityManager.getQueueStatus();
    const networkStatus = this.networkMonitor.getNetworkStatus();
    const pollingStatus = this.pollingManager.getPollingStatus();

    if (queueStatus.high + queueStatus.normal + queueStatus.low > 0) {
      debug.info("API_PERFORMANCE", "請求隊列狀態", queueStatus);
    }

    if (pollingStatus.length > 0) {
      debug.info("API_PERFORMANCE", "輪詢狀態", pollingStatus);
    }

    if (networkStatus.quality !== "fast") {
      debug.info("API_PERFORMANCE", "網路狀態", networkStatus);
    }
  }

  // 🆕 根據網路狀況調整配置
  private adjustNetworkConfig(): void {
    const networkConfig = this.networkMonitor.getOptimalRequestConfig();

    // 更新 axios 超時設置
    this.axios.defaults.timeout = networkConfig.timeout;

    debug.debug("API_PERFORMANCE", "調整網路配置", networkConfig);
  }

  private setupInterceptors() {
    let requestStartTime: number;

    // 請求攔截器 - 增強性能監控
    this.axios.interceptors.request.use(
      (config) => {
        requestStartTime = Date.now();

        debug.debug(
          "API_REQUEST",
          `發送請求: ${config.method?.toUpperCase()} ${config.url}`,
          {
            url: config.url,
            method: config.method,
            headers: this.sanitizeHeaders(config.headers),
            hasData: !!config.data,
            hasParams: !!config.params,
            timeout: config.timeout,
          }
        );

        return config;
      },
      (error) => {
        debug.error("API_REQUEST", "請求配置錯誤", { error });
        return Promise.reject(error);
      }
    );

    // 響應攔截器 - 增強錯誤處理和性能監控
    this.axios.interceptors.response.use(
      (response) => {
        const responseTime = requestStartTime
          ? Date.now() - requestStartTime
          : 0;

        // 記錄 API 調用詳情
        const apiCallDetails: ApiCallDetails = {
          method: response.config.method?.toUpperCase() || "UNKNOWN",
          url: response.config.url || "unknown",
          responseStatus: response.status,
          responseTime,
          responseData: response.data,
        };

        debug.logApiCall(apiCallDetails);

        // 🆕 性能警告
        if (responseTime > 5000) {
          debug.warn("API_PERFORMANCE", "慢請求檢測", {
            url: response.config.url,
            responseTime,
            status: response.status,
          });
        }

        return response;
      },
      (error) => {
        const responseTime = requestStartTime
          ? Date.now() - requestStartTime
          : 0;

        // 記錄錯誤的 API 調用詳情
        const apiCallDetails: ApiCallDetails = {
          method: error.config?.method?.toUpperCase() || "UNKNOWN",
          url: error.config?.url || "unknown",
          responseStatus: error.response?.status,
          responseTime,
          error,
        };

        debug.logApiCall(apiCallDetails);

        // 處理特定錯誤狀態
        if (error.response?.status === 404) {
          debug.warn("API_ERROR", "API端點不存在，請檢查後端服務", {
            url: error.config?.url,
            availableEndpoints: "請檢查 API 文檔",
          });
        } else if (error.response?.status === 401) {
          debug.warn("API_ERROR", "認證失敗，可能需要重新登入", {
            url: error.config?.url,
            suggestion: "檢查認證狀態或刷新頁面",
          });
        } else if (error.response?.status === 429) {
          debug.warn("API_ERROR", "請求過於頻繁", {
            url: error.config?.url,
            retryAfter: error.response.headers?.["retry-after"],
            suggestion: "請減少請求頻率",
          });
        } else if (error.code === "ECONNABORTED") {
          debug.warn("API_ERROR", "請求超時", {
            url: error.config?.url,
            timeout: error.config?.timeout,
            suggestion: "請檢查網路連線或重試",
          });
        } else if (error.code === "ERR_NETWORK") {
          debug.error("API_ERROR", "網路連線失敗", {
            url: error.config?.url,
            suggestion: "請檢查網路連線和後端服務狀態",
          });
        }

        return Promise.reject(error);
      }
    );
  }

  // 認證相關 API
  auth = {
    /**
     * 獲取當前用戶資訊
     * GET /api/v1/auth/me
     */
    me: () =>
      this.get<{ isAuthenticated: boolean; user: UserProfile }>(
        "/api/v1/auth/me"
      ),

    /**
     * 用戶登出
     * POST /api/v1/auth/logout
     */
    logout: () => this.post("/api/v1/auth/logout"),
  };

  // 用戶相關 API
  users = {
    /**
     * 獲取用戶資料
     * GET /api/v1/users/profile
     */
    getProfile: () => this.get<UserProfile>("/api/v1/users/profile"),

    /**
     * 更新用戶資料
     * PUT /api/v1/users/profile
     */
    updateProfile: (data: UpdateProfileDto) =>
      this.put<UserProfile>("/api/v1/users/profile", data),

    /**
     * 獲取任務歷史
     * GET /api/v1/users/job-history
     */
    getJobHistory: (params?: PaginationParams) =>
      this.get<UserJobHistoryResponse>("/api/v1/users/job-history", { params }),

    /**
     * 獲取最近任務
     * GET /api/v1/users/recent-jobs
     */
    getRecentJobs: (days?: number) =>
      this.get<RecentJobsResponse>("/api/v1/users/recent-jobs", {
        params: { days },
      }),

    /**
     * 獲取發送郵箱
     * GET /api/v1/users/sender-email
     */
    getSenderEmail: () =>
      this.get<{ senderEmail: string }>("/api/v1/users/sender-email"),
  };

  // 小說相關 API
  novels = {
    /**
     * 預覽小說
     * POST /api/v1/novels/preview
     */
    preview: (data: PreviewNovelDto) =>
      this.post<PreviewResponse>("/api/v1/novels/preview", data),

    /**
     * 獲取預覽狀態
     * GET /api/v1/novels/preview/:jobId
     */
    getPreviewStatus: (jobId: string, options?: { skipCache?: boolean }) =>
      this.get<PreviewResponse>(`/api/v1/novels/preview/${jobId}`, {
        skipCache: options?.skipCache || false,
        priority: "high", // 狀態查詢設為高優先級
      }),

    /**
     * 根據ID獲取預覽
     * GET /api/v1/novels/:id/preview
     */
    getPreviewById: (id: string) =>
      this.get<PreviewResponse>(`/api/v1/novels/${id}/preview`),
  };

  // 轉檔相關 API
  conversions = {
    /**
     * 提交轉檔任務
     * POST /api/v1/conversions
     */
    create: (data: ConvertNovelDto) =>
      this.post<ConversionResponse>("/api/v1/conversions", data),

    /**
     * 獲取轉檔狀態
     * GET /api/v1/conversions/:jobId
     */
    getStatus: (jobId: string, options?: { skipCache?: boolean }) =>
      this.get<ConversionStatusResponse>(`/api/v1/conversions/${jobId}`, {
        skipCache: options?.skipCache || false,
        priority: "high", // 狀態查詢設為高優先級
      }),

    /**
     * 獲取下載連結
     * GET /api/v1/conversions/:jobId/file
     */
    getDownloadUrl: (jobId: string) =>
      this.get<DownloadResponse>(`/api/v1/conversions/${jobId}/file`),
  };

  // Kindle 相關 API
  kindle = {
    /**
     * 發送到 Kindle
     * POST /api/v1/kindle/deliveries
     */
    send: (data: SendToKindleDto) =>
      this.post<KindleDeliveryResponse>("/api/v1/kindle/deliveries", data),

    /**
     * 獲取交付狀態
     * GET /api/v1/kindle/deliveries/:id
     */
    getStatus: (id: string) =>
      this.get<KindleStatusResponse>(`/api/v1/kindle/deliveries/${id}`),

    /**
     * 獲取交付歷史
     * GET /api/v1/kindle/deliveries
     */
    getHistory: (params?: PaginationParams) =>
      this.get<KindleHistoryResponse>("/api/v1/kindle/deliveries", { params }),
  };

  // 健康檢查 API
  health = {
    /**
     * 基本健康檢查
     * GET /health
     */
    check: () => this.get("/health"),

    /**
     * 快速健康檢查
     * GET /health/quick
     */
    quick: () => this.get("/health/quick"),

    /**
     * 系統指標（需認證）
     * GET /api/v1/health/metrics
     */
    metrics: () => this.get("/api/v1/health/metrics"),
  };

  // 🆕 優化的 HTTP 請求方法 - 支持緩存、去重和優先級
  private get<T>(
    url: string,
    config?: AxiosRequestConfig & {
      priority?: "high" | "normal" | "low";
      cacheTTL?: number;
      skipCache?: boolean;
      skipDedup?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    const {
      priority = "normal",
      cacheTTL,
      skipCache = false,
      skipDedup = false,
      ...axiosConfig
    } = config || {};

    // 檢查緩存
    if (!skipCache) {
      const cached = this.cache.get("GET", url, axiosConfig.params);
      if (cached) {
        return Promise.resolve(cached);
      }
    }

    const requestFn = () =>
      this.axios.get(url, axiosConfig).then((res) => {
        const normalizedResponse = this.normalizeResponse<T>(res.data);

        // 設置緩存
        if (!skipCache && normalizedResponse.success) {
          this.cache.set(
            "GET",
            url,
            normalizedResponse,
            cacheTTL,
            axiosConfig.params
          );
        }

        debug.debug("API_NORMALIZE", `GET ${url} 響應標準化`, {
          original: res.data,
          normalized: normalizedResponse,
        });

        return normalizedResponse;
      });

    // 請求去重
    if (!skipDedup) {
      return this.deduplicator.deduplicate(
        "GET",
        url,
        () => this.priorityManager.enqueue(requestFn, priority),
        axiosConfig.params
      );
    }

    return this.priorityManager.enqueue(requestFn, priority);
  }

  private post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & {
      priority?: "high" | "normal" | "low";
      skipDedup?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    const {
      priority = "normal",
      skipDedup = false,
      ...axiosConfig
    } = config || {};

    const requestFn = () =>
      this.axios.post(url, data, axiosConfig).then((res) => {
        const normalizedResponse = this.normalizeResponse<T>(res.data);

        debug.debug("API_NORMALIZE", `POST ${url} 響應標準化`, {
          original: res.data,
          normalized: normalizedResponse,
        });

        return normalizedResponse;
      });

    // POST 請求通常不需要去重，除非明確指定
    if (!skipDedup) {
      return this.deduplicator.deduplicate(
        "POST",
        url,
        () => this.priorityManager.enqueue(requestFn, priority),
        data
      );
    }

    return this.priorityManager.enqueue(requestFn, priority);
  }

  private put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & {
      priority?: "high" | "normal" | "low";
    }
  ): Promise<ApiResponse<T>> {
    const { priority = "normal", ...axiosConfig } = config || {};

    const requestFn = () =>
      this.axios.put(url, data, axiosConfig).then((res) => {
        const normalizedResponse = this.normalizeResponse<T>(res.data);

        debug.debug("API_NORMALIZE", `PUT ${url} 響應標準化`, {
          original: res.data,
          normalized: normalizedResponse,
        });

        return normalizedResponse;
      });

    return this.priorityManager.enqueue(requestFn, priority);
  }

  private delete<T>(
    url: string,
    config?: AxiosRequestConfig & {
      priority?: "high" | "normal" | "low";
    }
  ): Promise<ApiResponse<T>> {
    const { priority = "normal", ...axiosConfig } = config || {};

    const requestFn = () =>
      this.axios.delete(url, axiosConfig).then((res) => {
        const normalizedResponse = this.normalizeResponse<T>(res.data);

        debug.debug("API_NORMALIZE", `DELETE ${url} 響應標準化`, {
          original: res.data,
          normalized: normalizedResponse,
        });

        return normalizedResponse;
      });

    return this.priorityManager.enqueue(requestFn, priority);
  }

  /**
   * 標準化響應格式 - 增強調試和驗證
   * 處理統一格式 { success: true, data: {...} } 和直接格式 { success: true, ... }
   */
  private normalizeResponse<T>(responseData: any): ApiResponse<T> {
    debug.verbose("API_NORMALIZE", "開始響應標準化", { responseData });

    try {
      // 如果響應已經是統一格式 { success: boolean, data: T, ... }
      if (
        responseData &&
        typeof responseData === "object" &&
        "success" in responseData
      ) {
        // 如果有 data 字段，說明是統一格式
        if ("data" in responseData) {
          debug.verbose("API_NORMALIZE", "檢測到統一格式響應");

          // 驗證統一格式的完整性
          const isValid = debug.validateApiResponse(responseData, "統一格式");
          if (!isValid) {
            debug.warn("API_NORMALIZE", "統一格式響應驗證失敗，但繼續處理");
          }

          return responseData as ApiResponse<T>;
        } else {
          // 如果沒有 data 字段，說明是直接格式，需要包裝
          debug.verbose("API_NORMALIZE", "檢測到直接格式響應，進行包裝");
          const { success, message, timestamp, ...rest } = responseData;
          const wrappedResponse = {
            success,
            data: rest as T,
            message,
            timestamp: timestamp || new Date().toISOString(),
          };

          debug.debug("API_NORMALIZE", "直接格式包裝完成", {
            original: responseData,
            wrapped: wrappedResponse,
          });

          return wrappedResponse;
        }
      }

      // 如果響應不包含 success 字段，假設是成功的數據
      debug.verbose("API_NORMALIZE", "檢測到原始數據響應，包裝為統一格式");
      const wrappedResponse = {
        success: true,
        data: responseData as T,
        timestamp: new Date().toISOString(),
      };

      debug.debug("API_NORMALIZE", "原始數據包裝完成", {
        original: responseData,
        wrapped: wrappedResponse,
      });

      return wrappedResponse;
    } catch (error) {
      debug.error("API_NORMALIZE", "響應標準化時發生錯誤", {
        error,
        responseData,
      });

      // 發生錯誤時返回基本格式
      return {
        success: false,
        data: undefined as T,
        message: "響應格式化失敗",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 私有方法：清理請求頭中的敏感信息
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sanitized = { ...headers };
    const sensitiveKeys = [
      "authorization",
      "cookie",
      "x-api-key",
      "x-auth-token",
    ];

    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  // 🆕 清理方法
  cleanup(): void {
    this.deduplicator.clear();
    this.cache.clear();
    this.priorityManager.clear();
    this.pollingManager.stopAll();
    this.networkMonitor.destroy();
  }

  // 🆕 增強的性能統計
  getPerformanceStats(): {
    queueStatus: ReturnType<RequestPriorityManager["getQueueStatus"]>;
    cacheSize: number;
    networkStatus: ReturnType<NetworkMonitor["getNetworkStatus"]>;
    pollingStatus: ReturnType<SmartPollingManager["getPollingStatus"]>;
    totalPendingRequests: number;
  } {
    return {
      queueStatus: this.priorityManager.getQueueStatus(),
      cacheSize: this.cache.size || 0,
      networkStatus: this.networkMonitor.getNetworkStatus(),
      pollingStatus: this.pollingManager.getPollingStatus(),
      totalPendingRequests: this.priorityManager.getTotalPending(),
    };
  }

  // 🆕 智能輪詢方法
  startSmartPolling(
    key: string,
    pollFn: () => Promise<boolean>,
    options?: {
      initialInterval?: number;
      maxInterval?: number;
      maxDuration?: number;
    }
  ): void {
    this.pollingManager.startPolling(key, pollFn, options);
  }

  // 🆕 停止輪詢
  stopPolling(key: string): void {
    this.pollingManager.stopPolling(key);
  }

  // 🆕 停止所有輪詢
  stopAllPolling(): void {
    this.pollingManager.stopAll();
  }
}

// 導出單例實例
export const apiClient = new ApiClient();
export default apiClient;

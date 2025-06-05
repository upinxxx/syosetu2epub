/**
 * 前端調試工具模組
 * 提供詳細的 API 調用日誌、響應數據格式驗證和開發模式下的調試信息
 */

// 調試級別枚舉
export enum DebugLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5,
}

// 調試配置介面
export interface DebugConfig {
  enabled: boolean;
  level: DebugLevel;
  logToConsole: boolean;
  logToStorage: boolean;
  maxStorageLogs: number;
}

// 日誌條目介面
export interface LogEntry {
  timestamp: string;
  level: DebugLevel;
  category: string;
  message: string;
  data?: any;
  trace?: string;
}

// API 調用詳情介面
export interface ApiCallDetails {
  method: string;
  url: string;
  requestData?: any;
  responseData?: any;
  responseStatus?: number;
  responseTime?: number;
  error?: any;
}

class DebugManager {
  private config: DebugConfig;
  private logs: LogEntry[] = [];
  private storageKey = "syosetu2epub_debug_logs";

  constructor() {
    // 根據環境變數和 localStorage 初始化配置
    const isDevelopment = import.meta.env.DEV;
    const storedLevel = localStorage.getItem("debug_level");

    this.config = {
      enabled: isDevelopment || Boolean(storedLevel),
      level: storedLevel
        ? parseInt(storedLevel)
        : isDevelopment
        ? DebugLevel.DEBUG
        : DebugLevel.ERROR,
      logToConsole: true,
      logToStorage: true,
      maxStorageLogs: 1000,
    };

    // 載入已存儲的日誌
    this.loadStoredLogs();

    // 監聽未捕獲的錯誤
    if (typeof window !== "undefined") {
      window.addEventListener("error", this.handleGlobalError.bind(this));
      window.addEventListener(
        "unhandledrejection",
        this.handleUnhandledRejection.bind(this)
      );
    }
  }

  /**
   * 設置調試配置
   */
  configure(config: Partial<DebugConfig>) {
    this.config = { ...this.config, ...config };
    if (config.level !== undefined) {
      localStorage.setItem("debug_level", config.level.toString());
    }
  }

  /**
   * 記錄日誌
   */
  log(
    level: DebugLevel,
    category: string,
    message: string,
    data?: any,
    includeTrace = false
  ) {
    if (!this.config.enabled || level > this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      trace: includeTrace ? new Error().stack : undefined,
    };

    // 添加到內存日誌
    this.logs.push(entry);

    // 限制內存日誌數量
    if (this.logs.length > this.config.maxStorageLogs) {
      this.logs = this.logs.slice(-this.config.maxStorageLogs);
    }

    // 輸出到控制台
    if (this.config.logToConsole) {
      this.logToConsole(entry);
    }

    // 存儲到 localStorage
    if (this.config.logToStorage) {
      this.saveLogsToStorage();
    }
  }

  /**
   * 記錄 API 調用詳情
   */
  logApiCall(details: ApiCallDetails) {
    if (!this.config.enabled || this.config.level < DebugLevel.INFO) {
      return;
    }

    const message = `${details.method} ${details.url}`;
    const logData = {
      method: details.method,
      url: details.url,
      status: details.responseStatus,
      responseTime: details.responseTime,
      hasError: !!details.error,
    };

    // 基本信息日誌
    this.log(DebugLevel.INFO, "API", message, logData);

    // 詳細的請求數據（僅在 DEBUG 級別）
    if (this.config.level >= DebugLevel.DEBUG) {
      if (details.requestData) {
        this.log(
          DebugLevel.DEBUG,
          "API_REQUEST",
          `Request data for ${message}`,
          details.requestData
        );
      }

      if (details.responseData) {
        this.log(
          DebugLevel.DEBUG,
          "API_RESPONSE",
          `Response data for ${message}`,
          details.responseData
        );
      }
    }

    // 錯誤日誌
    if (details.error) {
      this.log(
        DebugLevel.ERROR,
        "API_ERROR",
        `Error in ${message}`,
        details.error
      );
    }
  }

  /**
   * 驗證 API 響應格式
   */
  validateApiResponse(response: any, expectedFormat?: string): boolean {
    if (!this.config.enabled || this.config.level < DebugLevel.DEBUG) {
      return true; // 如果調試未啟用，假設格式正確
    }

    try {
      const issues: string[] = [];

      // 檢查基本結構
      if (!response || typeof response !== "object") {
        issues.push("響應不是有效的物件");
      } else {
        // 檢查 success 字段
        if (!("success" in response)) {
          issues.push("缺少 success 字段");
        } else if (typeof response.success !== "boolean") {
          issues.push("success 字段不是布林值");
        }

        // 檢查 timestamp 字段
        if ("timestamp" in response) {
          const timestamp = response.timestamp;
          if (typeof timestamp !== "string" || isNaN(Date.parse(timestamp))) {
            issues.push("timestamp 字段格式無效");
          }
        }

        // 檢查錯誤響應格式
        if (response.success === false) {
          if (!("error" in response)) {
            issues.push("錯誤響應缺少 error 字段");
          } else if (
            !response.error ||
            typeof response.error !== "object" ||
            !("code" in response.error) ||
            !("message" in response.error)
          ) {
            issues.push("錯誤響應的 error 字段格式無效");
          }
        }
      }

      // 記錄驗證結果
      if (issues.length > 0) {
        this.log(DebugLevel.WARN, "API_VALIDATION", "API 響應格式問題", {
          expectedFormat,
          issues,
          response,
        });
        return false;
      }

      this.log(DebugLevel.VERBOSE, "API_VALIDATION", "API 響應格式驗證通過", {
        expectedFormat,
        responseType: typeof response,
      });
      return true;
    } catch (error) {
      this.log(
        DebugLevel.ERROR,
        "API_VALIDATION",
        "響應格式驗證時發生錯誤",
        error
      );
      return false;
    }
  }

  /**
   * 格式化並顯示調試信息
   */
  formatDebugInfo(title: string, data: any): string {
    if (!this.config.enabled) return "";

    const formatted = {
      title,
      timestamp: new Date().toISOString(),
      data: this.sanitizeData(data),
    };

    return JSON.stringify(formatted, null, 2);
  }

  /**
   * 獲取日誌歷史
   */
  getLogs(category?: string, level?: DebugLevel): LogEntry[] {
    let filteredLogs = this.logs;

    if (category) {
      filteredLogs = filteredLogs.filter(
        (log) => log.category === category || log.category.includes(category)
      );
    }

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter((log) => log.level <= level);
    }

    return filteredLogs;
  }

  /**
   * 清除日誌
   */
  clearLogs() {
    this.logs = [];
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.storageKey);
    }
    this.log(DebugLevel.INFO, "DEBUG", "調試日誌已清除");
  }

  /**
   * 導出日誌為 JSON 文件
   */
  exportLogs(): string {
    const exportData = {
      config: this.config,
      logs: this.logs,
      exportedAt: new Date().toISOString(),
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 私有方法：輸出到控制台
   */
  private logToConsole(entry: LogEntry) {
    const { level, category, message, data } = entry;
    const prefix = `[${category}] ${message}`;

    switch (level) {
      case DebugLevel.ERROR:
        console.error(prefix, data);
        break;
      case DebugLevel.WARN:
        console.warn(prefix, data);
        break;
      case DebugLevel.INFO:
        console.info(prefix, data);
        break;
      case DebugLevel.DEBUG:
        console.debug(prefix, data);
        break;
      case DebugLevel.VERBOSE:
        console.log(prefix, data);
        break;
    }
  }

  /**
   * 私有方法：處理全域錯誤
   */
  private handleGlobalError(event: ErrorEvent) {
    this.log(DebugLevel.ERROR, "GLOBAL_ERROR", event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  }

  /**
   * 私有方法：處理未處理的 Promise 拒絕
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    this.log(DebugLevel.ERROR, "UNHANDLED_REJECTION", "Promise rejection", {
      reason: event.reason,
    });
  }

  /**
   * 私有方法：載入存儲的日誌
   */
  private loadStoredLogs() {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const logs = JSON.parse(stored);
        if (Array.isArray(logs)) {
          this.logs = logs.slice(-this.config.maxStorageLogs);
        }
      }
    } catch (error) {
      console.warn("無法載入存儲的調試日誌:", error);
    }
  }

  /**
   * 私有方法：保存日誌到存儲
   */
  private saveLogsToStorage() {
    if (typeof window === "undefined") return;

    try {
      const logsToSave = this.logs.slice(-this.config.maxStorageLogs);
      localStorage.setItem(this.storageKey, JSON.stringify(logsToSave));
    } catch (error) {
      console.warn("無法保存調試日誌到存儲:", error);
    }
  }

  /**
   * 私有方法：清理敏感數據
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    if (typeof data === "string") {
      // 隱藏可能的敏感信息
      return data.replace(/password|token|key|secret/gi, "[REDACTED]");
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    if (typeof data === "object") {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (/password|token|key|secret/i.test(key)) {
          sanitized[key] = "[REDACTED]";
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }
}

// 創建全域調試管理器實例
const debugManager = new DebugManager();

// 導出便捷方法
export const debug = {
  // 日誌記錄方法
  error: (category: string, message: string, data?: any) =>
    debugManager.log(DebugLevel.ERROR, category, message, data),
  warn: (category: string, message: string, data?: any) =>
    debugManager.log(DebugLevel.WARN, category, message, data),
  info: (category: string, message: string, data?: any) =>
    debugManager.log(DebugLevel.INFO, category, message, data),
  debug: (category: string, message: string, data?: any) =>
    debugManager.log(DebugLevel.DEBUG, category, message, data),
  verbose: (category: string, message: string, data?: any) =>
    debugManager.log(DebugLevel.VERBOSE, category, message, data),

  // API 相關方法
  logApiCall: (details: ApiCallDetails) => debugManager.logApiCall(details),
  validateApiResponse: (response: any, expectedFormat?: string) =>
    debugManager.validateApiResponse(response, expectedFormat),

  // 工具方法
  formatDebugInfo: (title: string, data: any) =>
    debugManager.formatDebugInfo(title, data),
  getLogs: (category?: string, level?: DebugLevel) =>
    debugManager.getLogs(category, level),
  clearLogs: () => debugManager.clearLogs(),
  exportLogs: () => debugManager.exportLogs(),

  // 配置方法
  configure: (config: Partial<DebugConfig>) => debugManager.configure(config),
  getConfig: () => debugManager["config"],
};

// 導出調試管理器（用於高級使用）
export { debugManager };

// 開發模式下的全域調試對象
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as any).__SYOSETU_DEBUG__ = debug;
}

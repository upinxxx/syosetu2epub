import { toast } from "sonner";
import type { AxiosError } from "axios";

/**
 * 錯誤類型枚舉
 */
export enum ErrorType {
  NETWORK = "NETWORK",
  TIMEOUT = "TIMEOUT",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMIT = "RATE_LIMIT",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN",
}

/**
 * 標準化錯誤信息接口
 */
export interface StandardError {
  type: ErrorType;
  code: string;
  message: string;
  userMessage: string;
  details?: any;
  shouldRetry: boolean;
  retryDelay?: number;
}

/**
 * 錯誤處理配置
 */
export interface ErrorHandlerConfig {
  showToast?: boolean;
  toastDuration?: number;
  logError?: boolean;
  context?: string;
}

/**
 * 解析錯誤並返回標準化錯誤信息
 */
export function parseError(error: any, context?: string): StandardError {
  console.error(`錯誤解析 [${context || "未知"}]:`, error);

  // 網路錯誤
  if (
    error.code === "ERR_NETWORK" ||
    error.message?.includes("Network Error")
  ) {
    return {
      type: ErrorType.NETWORK,
      code: "NETWORK_ERROR",
      message: error.message || "網路連線失敗",
      userMessage: "網路連線失敗，請檢查網路狀態後重試",
      shouldRetry: true,
      retryDelay: 3000,
    };
  }

  // 超時錯誤
  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return {
      type: ErrorType.TIMEOUT,
      code: "REQUEST_TIMEOUT",
      message: error.message || "請求超時",
      userMessage: "請求超時，請稍後重試",
      shouldRetry: true,
      retryDelay: 5000,
    };
  }

  // Axios 錯誤
  if (error.response) {
    const status = error.response.status;
    const responseData = error.response.data;

    switch (status) {
      case 400:
        return {
          type: ErrorType.VALIDATION,
          code: responseData?.error?.code || "BAD_REQUEST",
          message: responseData?.error?.message || error.message,
          userMessage:
            responseData?.error?.message || "請求參數錯誤，請檢查輸入內容",
          shouldRetry: false,
          details: responseData?.error?.details,
        };

      case 401:
        return {
          type: ErrorType.AUTHENTICATION,
          code: responseData?.error?.code || "UNAUTHORIZED",
          message: responseData?.error?.message || "認證失敗",
          userMessage: "登入已過期，請重新登入",
          shouldRetry: false,
        };

      case 403:
        return {
          type: ErrorType.AUTHORIZATION,
          code: responseData?.error?.code || "FORBIDDEN",
          message: responseData?.error?.message || "權限不足",
          userMessage: "沒有權限執行此操作",
          shouldRetry: false,
        };

      case 404:
        return {
          type: ErrorType.NOT_FOUND,
          code: responseData?.error?.code || "NOT_FOUND",
          message: responseData?.error?.message || "資源不存在",
          userMessage: "找不到請求的資源，請確認輸入是否正確",
          shouldRetry: false,
        };

      case 429:
        return {
          type: ErrorType.RATE_LIMIT,
          code: responseData?.error?.code || "RATE_LIMIT",
          message: responseData?.error?.message || "請求過於頻繁",
          userMessage: "請求過於頻繁，請稍後再試",
          shouldRetry: true,
          retryDelay: 10000,
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: ErrorType.SERVER_ERROR,
          code: responseData?.error?.code || "SERVER_ERROR",
          message: responseData?.error?.message || "伺服器錯誤",
          userMessage: "伺服器暫時無法處理請求，請稍後重試",
          shouldRetry: true,
          retryDelay: 8000,
          details: responseData?.error?.details,
        };

      default:
        return {
          type: ErrorType.UNKNOWN,
          code: responseData?.error?.code || "HTTP_ERROR",
          message: responseData?.error?.message || error.message,
          userMessage:
            responseData?.error?.message || "發生未知錯誤，請稍後重試",
          shouldRetry: false,
          details: responseData?.error?.details,
        };
    }
  }

  // 其他錯誤
  return {
    type: ErrorType.UNKNOWN,
    code: error.code || "UNKNOWN_ERROR",
    message: error.message || "未知錯誤",
    userMessage: "發生未知錯誤，請稍後重試",
    shouldRetry: false,
  };
}

/**
 * 統一錯誤處理函數
 */
export function handleError(
  error: any,
  config: ErrorHandlerConfig = {}
): StandardError {
  const {
    showToast = true,
    toastDuration = 5000,
    logError = true,
    context,
  } = config;

  const standardError = parseError(error, context);

  // 記錄錯誤日誌
  if (logError) {
    console.error(`錯誤處理 [${context || "未知"}]:`, {
      type: standardError.type,
      code: standardError.code,
      message: standardError.message,
      userMessage: standardError.userMessage,
      shouldRetry: standardError.shouldRetry,
      originalError: error,
    });
  }

  // 顯示 Toast 通知
  if (showToast) {
    const toastOptions = {
      duration: toastDuration,
      description: context ? `操作：${context}` : undefined,
    };

    switch (standardError.type) {
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        toast.error(standardError.userMessage, {
          ...toastOptions,
          description: "網路問題",
        });
        break;

      case ErrorType.AUTHENTICATION:
        toast.error(standardError.userMessage, {
          ...toastOptions,
          description: "認證問題",
        });
        break;

      case ErrorType.AUTHORIZATION:
        toast.error(standardError.userMessage, {
          ...toastOptions,
          description: "權限問題",
        });
        break;

      case ErrorType.VALIDATION:
        toast.error(standardError.userMessage, {
          ...toastOptions,
          description: "輸入驗證",
        });
        break;

      case ErrorType.NOT_FOUND:
        toast.error(standardError.userMessage, {
          ...toastOptions,
          description: "資源不存在",
        });
        break;

      case ErrorType.RATE_LIMIT:
        toast.warning(standardError.userMessage, {
          ...toastOptions,
          description: "請求限制",
        });
        break;

      case ErrorType.SERVER_ERROR:
        toast.error(standardError.userMessage, {
          ...toastOptions,
          description: "伺服器問題",
        });
        break;

      default:
        toast.error(standardError.userMessage, {
          ...toastOptions,
          description: "未知錯誤",
        });
    }
  }

  return standardError;
}

/**
 * 響應數據驗證函數
 */
export function validateApiResponse<T>(
  response: any,
  context?: string
): { isValid: boolean; data?: T; error?: StandardError } {
  try {
    // 檢查響應是否存在
    if (!response) {
      const error = handleError(new Error("API 響應為空"), {
        context,
        showToast: false,
      });
      return { isValid: false, error };
    }

    // 檢查 success 字段
    if (typeof response.success !== "boolean") {
      const error = handleError(
        new Error("API 響應格式錯誤：缺少 success 字段"),
        { context, showToast: false }
      );
      return { isValid: false, error };
    }

    // 檢查是否成功
    if (!response.success) {
      const error = handleError(new Error(response.message || "API 操作失敗"), {
        context,
        showToast: false,
      });
      return { isValid: false, error };
    }

    // 提取數據
    const data = response.data || response;
    return { isValid: true, data };
  } catch (error) {
    const standardError = handleError(error, { context, showToast: false });
    return { isValid: false, error: standardError };
  }
}

/**
 * 重試邏輯包裝函數
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  context?: string
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const standardError = parseError(error, context);

      // 如果不應該重試，直接拋出錯誤
      if (!standardError.shouldRetry || attempt === maxRetries) {
        throw error;
      }

      // 等待重試延遲
      if (standardError.retryDelay) {
        await new Promise((resolve) =>
          setTimeout(resolve, standardError.retryDelay)
        );
      }
    }
  }

  throw lastError;
}

/**
 * 錯誤邊界處理函數
 */
export function createErrorBoundary(context: string) {
  return (error: any) => {
    return handleError(error, { context, showToast: true });
  };
}

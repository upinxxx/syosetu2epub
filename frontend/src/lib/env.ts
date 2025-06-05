/**
 * 前端環境變數統一管理
 * 只保留實際使用的環境變數，避免混淆
 */

// 取得 API Base URL
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
};

// 環境變數配置
export const ENV = {
  // API 相關
  API_BASE_URL: getApiBaseUrl(),

  // 環境檢查
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  NODE_ENV: import.meta.env.NODE_ENV || "development",
} as const;

// 驗證環境變數
export const validateEnv = (): void => {
  console.log("🔧 環境變數檢查:", {
    API_BASE_URL: ENV.API_BASE_URL,
    NODE_ENV: ENV.NODE_ENV,
    IS_DEVELOPMENT: ENV.IS_DEVELOPMENT,
  });

  if (ENV.IS_PRODUCTION && ENV.API_BASE_URL.includes("localhost")) {
    console.warn("⚠️ 生產環境仍使用本地 API URL");
  }
};

// 在開發環境自動驗證
if (ENV.IS_DEVELOPMENT) {
  validateEnv();
}

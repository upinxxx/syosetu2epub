/**
 * 前端環境變數統一管理
 * 解決不同檔案中使用不同環境變數名稱的問題
 */

// 取得 API Base URL，優先級順序
export const getApiBaseUrl = (): string => {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:3000"
  );
};

// 環境變數配置
export const ENV = {
  // API 相關
  API_BASE_URL: getApiBaseUrl(),

  // 應用程式配置
  APP_NAME: import.meta.env.VITE_APP_NAME || "Syosetu2EPUB",
  APP_VERSION: import.meta.env.VITE_APP_VERSION || "1.0.0",

  // 第三方服務
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,

  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // 環境檢查
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  NODE_ENV: import.meta.env.NODE_ENV || "development",
} as const;

// 驗證必要的環境變數
export const validateEnv = (): void => {
  console.log("🔧 環境變數檢查:", {
    API_BASE_URL: ENV.API_BASE_URL,
    APP_NAME: ENV.APP_NAME,
    NODE_ENV: ENV.NODE_ENV,
    IS_DEVELOPMENT: ENV.IS_DEVELOPMENT,
    HAS_GOOGLE_CLIENT_ID: !!ENV.GOOGLE_CLIENT_ID,
    HAS_SUPABASE_CONFIG: !!(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY),
  });

  if (ENV.IS_PRODUCTION && !ENV.GOOGLE_CLIENT_ID) {
    console.warn("⚠️ 生產環境缺少 Google Client ID");
  }

  if (ENV.IS_PRODUCTION && ENV.API_BASE_URL.includes("localhost")) {
    console.warn("⚠️ 生產環境仍使用本地 API URL");
  }
};

// 在開發環境自動驗證
if (ENV.IS_DEVELOPMENT) {
  validateEnv();
}

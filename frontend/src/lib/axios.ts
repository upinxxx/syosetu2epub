import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:3000",
  timeout: 10000,
  withCredentials: true,
});

// 添加請求攔截器，便於調試
instance.interceptors.request.use(
  (config) => {
    console.log("發送請求:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("請求配置錯誤:", error);
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API錯誤:", err);
    console.error("錯誤詳情:", {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
    });
    return Promise.reject(err);
  }
);

export default instance;

import axios from "axios";
import { ENV } from "./env.js";

const instance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

// 添加請求攔截器，便於調試
instance.interceptors.request.use(
  (config) => {
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

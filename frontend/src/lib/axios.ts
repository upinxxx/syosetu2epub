import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:3000",
  timeout: 10000,
});

instance.interceptors.response.use(
  (res) => res,
  (err) => {
    alert(err.response?.data?.message || "發生錯誤");
    return Promise.reject(err);
  }
);

export default instance;

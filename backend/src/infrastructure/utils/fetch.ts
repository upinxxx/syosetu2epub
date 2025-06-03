// src/infrastructure/utils/fetch.ts
import axios, { AxiosInstance } from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 5000; // 5秒超時

// 建立一個共用的 Axios instance，預設帶上常用 headers
const httpClient: AxiosInstance = axios.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/114.0.5735.199 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  responseType: 'text',
  timeout: REQUEST_TIMEOUT, // 🔑 添加超時設置
});

// fetch with retry
export async function fetchWithRetry(
  url: string,
  timeoutMs?: number,
): Promise<string> {
  let attempts = 0;
  const timeout = timeoutMs || REQUEST_TIMEOUT;

  while (attempts < MAX_RETRIES) {
    try {
      const res = await httpClient.get<string>(url, {
        timeout, // 🔑 支持自定義超時
      });
      return res.data;
    } catch (err) {
      attempts++;

      // 🔑 記錄超時和重試信息
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        console.warn(
          `請求 ${url} 超時 (${timeout}ms)，重試 ${attempts}/${MAX_RETRIES}`,
        );
      } else {
        console.warn(
          `請求 ${url} 失敗: ${err.message}，重試 ${attempts}/${MAX_RETRIES}`,
        );
      }

      if (attempts < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      } else {
        // 🔑 提供更詳細的錯誤信息
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          throw new Error(`請求超時：${url} (${timeout}ms)`);
        }
        throw err;
      }
    }
  }
  throw new Error('unreachable');
}

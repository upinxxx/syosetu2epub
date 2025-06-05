// src/infrastructure/utils/fetch.ts
import axios, { AxiosInstance } from 'axios';

const MAX_RETRIES = 3; // 🔧 減少重試次數
const RETRY_DELAY = 500; // 🔧 減少重試延遲
const REQUEST_TIMEOUT = 3000; // 🔧 減少超時時間至3秒

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
  timeout: REQUEST_TIMEOUT,
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
        timeout,
      });
      return res.data;
    } catch (err) {
      attempts++;

      // 🔧 簡化日誌記錄，避免過度輸出
      if (attempts < MAX_RETRIES) {
        console.warn(`請求 ${url} 失敗，重試 ${attempts}/${MAX_RETRIES}`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      } else {
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          throw new Error(`請求超時：${url} (${timeout}ms)`);
        }
        throw err;
      }
    }
  }
  throw new Error('unreachable');
}

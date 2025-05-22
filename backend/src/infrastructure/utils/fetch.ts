// src/infrastructure/utils/fetch.ts
import axios, { AxiosInstance } from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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
});

// fetch with retry
export async function fetchWithRetry(url: string): Promise<string> {
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      const res = await httpClient.get<string>(url);
      return res.data;
    } catch (err) {
      attempts++;
      if (attempts < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      } else {
        throw err;
      }
    }
  }
  throw new Error('unreachable');
}

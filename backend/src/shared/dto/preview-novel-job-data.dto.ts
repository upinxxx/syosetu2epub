import { NovelSource } from '@/domain/enums/novel-source.enum.js';

/**
 * 預覽小說任務數據
 */
export class PreviewNovelJobData {
  /**
   * 任務 ID
   */
  jobId: string;

  /**
   * 小說來源
   */
  source: NovelSource;

  /**
   * 小說來源 ID
   */
  sourceId: string;

  /**
   * 請求 ID (用於追蹤請求)
   */
  requestId?: string;
}

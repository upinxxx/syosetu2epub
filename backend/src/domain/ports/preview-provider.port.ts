import { NovelIndex } from './crawler.strategy.port.js';

// Port 令牌，用於依賴注入
export const PREVIEW_PROVIDER_TOKEN = Symbol('PREVIEW_PROVIDER');

/**
 * 預覽提供者抽象介面
 * 負責獲取小說的基本信息與章節內容，不耦合特定網站的實作
 */
export interface PreviewProviderPort {
  /**
   * 獲取小說基本信息，包括標題、作者、描述和章節列表
   * @param sourceId 小說 ID
   */
  fetchNovelInfo(ourceId: string): Promise<NovelIndex>;
}

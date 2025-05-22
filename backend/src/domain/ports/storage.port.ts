// Port 令牌，用於依賴注入
export const STORAGE_PORT_TOKEN = Symbol('STORAGE_PORT');

/**
 * 儲存服務埠介面
 * 負責檔案的上傳與獲取公開 URL，不耦合特定雲儲存服務的實作
 */
export interface StoragePort {
  /**
   * 上傳檔案並獲取公開 URL
   * @param filePath 本地檔案路徑
   * @param fileName 目標檔案名稱
   * @param contentType 可選的內容類型
   */
  uploadFile(
    filePath: string,
    fileName: string,
    contentType?: string,
  ): Promise<string>;

  /**
   * 獲取檔案公開 URL
   * @param fileName 檔案名稱
   */
  getPublicUrl(fileName: string): string;

  /**
   * 刪除檔案
   * @param fileName 檔案名稱
   */
  deleteFile(fileName: string): Promise<void>;
}

/**
 * FileDownloaderPort 檔案下載端口介面
 * 定義從URL下載檔案的抽象方法
 */
export interface FileDownloaderPort {
  /**
   * 從URL下載檔案
   * @param url 檔案URL
   * @returns Promise<Buffer> 檔案內容的Buffer
   */
  download(url: string): Promise<Buffer>;

  /**
   * 獲取檔案名稱（從URL或其他方式）
   * @param url 檔案URL
   * @returns string 檔案名稱
   */
  getFilename(url: string): string;
}

export const FILE_DOWNLOADER_PORT = 'FILE_DOWNLOADER_PORT';

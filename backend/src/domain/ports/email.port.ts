/**
 * 電子郵件服務端口接口
 * 定義發送電子郵件的抽象方法
 */
export interface EmailPort {
  /**
   * 發送 EPUB 到 Kindle
   * @param from 發送者郵箱
   * @param kindleEmail 接收者 Kindle 郵箱
   * @param epubPath EPUB 檔案本地路徑
   * @returns Promise<void>
   */
  sendEpubToKindle(
    fromEmail: string,
    kindleEmail: string,
    epubPath: string,
  ): Promise<void>;
}

// Port 令牌，用於依賴注入
export const EMAIL_PROVIDER_TOKEN = Symbol('EMAIL_PROVIDER_TOKEN');

/**
 * 電子郵件附件
 */
export interface EmailAttachment {
  /** 檔案名稱 */
  filename: string;

  /** 檔案內容 */
  content?: Buffer | string;

  /** 檔案路徑 */
  path?: string;

  /** 內容 ID，用於嵌入圖片 */
  cid?: string;

  /** 內容類型 */
  contentType?: string;
}

/**
 * 電子郵件內容
 */
export interface EmailContent {
  /** 收件人 */
  to: string;

  /** 寄件人 */
  from?: string;

  /** 郵件主旨 */
  subject: string;

  /** 郵件純文字內容 */
  text?: string;

  /** 郵件 HTML 內容 */
  html?: string;

  /** 附件 */
  attachments?: EmailAttachment[];
}

/**
 * 電子郵件服務埠介面
 * 負責發送電子郵件通知，不耦合特定郵件服務的實作
 */
export interface EmailPort {
  /**
   * 發送電子郵件
   * @param content 郵件內容
   */
  sendEmail(content: EmailContent): Promise<void>;

  /**
   * 發送下載完成通知
   * @param to 收件人
   * @param novelTitle 小說標題
   * @param downloadUrl 下載連結
   */
  sendDownloadNotification(
    to: string,
    novelTitle: string,
    downloadUrl: string,
  ): Promise<void>;
}

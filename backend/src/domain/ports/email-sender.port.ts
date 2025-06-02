/**
 * SendEmailResult 郵件發送結果
 */
export interface SendEmailResult {
  id: string; // 郵件ID
  success: boolean; // 是否成功
}

/**
 * SendEmailOptions 郵件發送選項
 */
export interface SendEmailOptions {
  from?: string; // 發件人郵箱（可選，由適配器提供預設值）
  to: string; // 收件人郵箱
  subject?: string; // 郵件主題（Kindle郵件可選）
  attachmentBuffer: Buffer; // EPUB檔案Buffer
  filename: string; // EPUB檔案名稱
}

/**
 * EmailSenderPort 郵件發送端口介面
 * 用於定義發送郵件的抽象方法，便於實現不同的郵件服務供應商
 */
export interface EmailSenderPort {
  /**
   * 發送郵件方法
   * @param options 郵件發送選項
   * @returns Promise<SendEmailResult>
   */
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}

export const EMAIL_SENDER_PORT = 'EMAIL_SENDER_PORT';

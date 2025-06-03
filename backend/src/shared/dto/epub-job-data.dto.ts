export interface EpubJobData {
  /** 任務 ID */
  jobId: string;

  /** 小說 ID */
  novelId: string;

  /** 用戶 ID（null 表示匿名用戶，string 表示已登入用戶） */
  userId?: string | null;
}

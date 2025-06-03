/**
 * 分佈式鎖服務 Port
 * 定義分佈式鎖的契約介面
 */
export interface LockPort {
  /**
   * 獲取分佈式鎖
   * @param key 鎖的唯一標識
   * @param ttlMs 鎖的存活時間（毫秒）
   * @param timeoutMs 獲取鎖的超時時間（毫秒）
   * @returns 如果成功獲取鎖則返回釋放函數，否則返回 null
   */
  acquireLock(
    key: string,
    ttlMs?: number,
    timeoutMs?: number,
  ): Promise<(() => Promise<void>) | null>;

  /**
   * 嘗試獲取鎖（非阻塞）
   * @param key 鎖的唯一標識
   * @param ttlMs 鎖的存活時間（毫秒）
   * @returns 如果成功獲取鎖則返回釋放函數，否則返回 null
   */
  tryLock(key: string, ttlMs?: number): Promise<(() => Promise<void>) | null>;

  /**
   * 釋放鎖
   * @param key 鎖的唯一標識
   */
  releaseLock(key: string): Promise<void>;

  /**
   * 檢查鎖是否存在
   * @param key 鎖的唯一標識
   */
  isLocked(key: string): Promise<boolean>;
}

export const LOCK_PORT_TOKEN = 'LOCK_PORT';

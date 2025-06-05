import { Inject, Injectable, Logger } from '@nestjs/common';
import { LockPort } from '@/domain/ports/lock.port.js';
import { Redis } from 'ioredis';
/**
 * 基於 Redis 的分佈式鎖適配器
 * 實現分佈式鎖機制，確保並發操作的原子性
 * 使用統一的 Redis 服務
 */
@Injectable()
export class DistributedLockAdapter implements LockPort {
  private readonly logger = new Logger(DistributedLockAdapter.name);
  private readonly lockPrefix = 'syosetu2epub:lock:';
  private readonly defaultTtlMs = 30000; // 預設 30 秒
  private readonly defaultTimeoutMs = 5000; // 預設等待 5 秒

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    this.logger.log('分佈式鎖適配器已初始化（使用統一 Redis 服務）');
  }

  /**
   * 獲取分佈式鎖（阻塞等待）
   */
  async acquireLock(
    key: string,
    ttlMs: number = this.defaultTtlMs,
    timeoutMs: number = this.defaultTimeoutMs,
  ): Promise<(() => Promise<void>) | null> {
    const lockKey = this.getLockKey(key);
    const lockValue = this.generateLockValue();
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const acquired = await this.tryAcquire(lockKey, lockValue, ttlMs);
      if (acquired) {
        this.logger.debug(`成功獲取鎖: ${key}`);
        return () => this.releaseLockWithValue(lockKey, lockValue);
      }

      // 短暫等待後重試
      await this.sleep(50);
    }

    this.logger.warn(`獲取鎖超時: ${key}`);
    return null;
  }

  /**
   * 嘗試獲取鎖（非阻塞）
   */
  async tryLock(
    key: string,
    ttlMs: number = this.defaultTtlMs,
  ): Promise<(() => Promise<void>) | null> {
    const lockKey = this.getLockKey(key);
    const lockValue = this.generateLockValue();

    const acquired = await this.tryAcquire(lockKey, lockValue, ttlMs);
    if (acquired) {
      this.logger.debug(`成功獲取鎖: ${key}`);
      return () => this.releaseLockWithValue(lockKey, lockValue);
    }

    return null;
  }

  /**
   * 釋放鎖
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = this.getLockKey(key);
    try {
      await this.redis.del(lockKey);
      this.logger.debug(`釋放鎖: ${key}`);
    } catch (error) {
      this.logger.error(`釋放鎖失敗: ${key}, 錯誤: ${error.message}`);
      throw error;
    }
  }

  /**
   * 檢查鎖是否存在
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    try {
      const exists = await this.redis.exists(lockKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`檢查鎖狀態失敗: ${key}, 錯誤: ${error.message}`);
      return false;
    }
  }

  /**
   * 嘗試獲取鎖的內部實現
   */
  private async tryAcquire(
    lockKey: string,
    lockValue: string,
    ttlMs: number,
  ): Promise<boolean> {
    try {
      // 使用 SET with NX (not exists) 和 EX (expire) 選項來原子性地設置鎖
      const result = await this.redis.set(
        lockKey,
        lockValue,
        'PX', // 毫秒級過期時間
        ttlMs,
        'NX', // 只有當 key 不存在時才設置
      );
      return result === 'OK';
    } catch (error) {
      this.logger.error(`嘗試獲取鎖失敗: ${lockKey}, 錯誤: ${error.message}`);
      return false;
    }
  }

  /**
   * 使用 Lua 腳本安全地釋放鎖
   */
  private async releaseLockWithValue(
    lockKey: string,
    lockValue: string,
  ): Promise<void> {
    const luaScript = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.redis.eval(luaScript, 1, lockKey, lockValue);
      if (result === 1) {
        this.logger.debug(`安全釋放鎖: ${lockKey}`);
      } else {
        this.logger.warn(`鎖已被其他進程釋放或過期: ${lockKey}`);
      }
    } catch (error) {
      this.logger.error(`釋放鎖失敗: ${lockKey}, 錯誤: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成鎖的完整 key
   */
  private getLockKey(key: string): string {
    return `${this.lockPrefix}${key}`;
  }

  /**
   * 生成鎖的唯一值
   */
  private generateLockValue(): string {
    return `${process.pid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 睡眠函數
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

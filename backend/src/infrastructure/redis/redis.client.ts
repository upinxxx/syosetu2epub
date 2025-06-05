import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * 統一的 Redis 服務
 * 提供單一連接池，改善連接穩定性，減少 ECONNRESET 錯誤
 */
@Injectable()
export class RedisClient implements OnModuleDestroy {
  private readonly logger = new Logger(RedisClient.name);
  private readonly redis: Redis;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  private resolveReady: () => void;
  private rejectReady: (reason?: any) => void;
  private readonly readyPromise: Promise<void>;
  private isReadyPromiseSettled = false;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.isReadyPromiseSettled = false;

    this.redis = this.createRedisConnection();
    this.setupEventHandlers();
  }

  /**
   * 建立 Redis 連接（優化配置）
   */
  private createRedisConnection(): Redis {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT');

    if (!host || !port) {
      this.logger.error(
        'Redis configuration (REDIS_HOST, REDIS_PORT) not found in environment variables.',
      );
      if (
        typeof this.rejectReady === 'function' &&
        !this.isReadyPromiseSettled
      ) {
        this.rejectReady(new Error('Redis configuration not found'));
        this.isReadyPromiseSettled = true;
      }
      throw new Error(
        'Redis configuration not found, cannot create connection.',
      );
    }

    this.logger.log(`Creating Redis connection to: ${host}:${port}`);

    const connectionConfig: any = {
      host,
      port,
      tsl: {},
      connectTimeout: 30000,
      commandTimeout: 25000,
      lazyConnect: false,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      reconnectOnError: (err) => {
        const targetError =
          /READONLY|ECONNRESET|ETIMEDOUT|ENOTFOUND|ENETUNREACH|Connection is closed|Command timed out/i;
        const shouldReconnect = targetError.test(err.message);
        if (shouldReconnect) {
          this.logger.warn(
            `Redis reconnectOnError: Error [${err.message}] triggers reconnect.`,
          );
        }
        return shouldReconnect;
      },
      retryDelayOnClusterDown: 300,
      showFriendlyErrorStack: true,
      maxLoadingTimeout: 30000,
    };

    return new Redis(connectionConfig);
  }

  /**
   * 設定事件處理器
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('RedisClient: Successfully connected to Redis.');
    });

    this.redis.on('ready', () => {
      this.logger.log('RedisClient: Connection ready.');
      this.isConnected = true;
      if (
        typeof this.resolveReady === 'function' &&
        !this.isReadyPromiseSettled
      ) {
        this.resolveReady();
        this.isReadyPromiseSettled = true;
      }
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      // 只記錄重要錯誤，過濾常見的連接錯誤
      if (this.shouldLogError(error)) {
        this.logger.error(
          `RedisClient: Connection error: ${error.message}`,
          error.stack,
        );
      } else {
        // 對於常見錯誤，只記錄警告級別
        this.logger.warn(`RedisClient: Connection issue: ${error.message}`);
      }

      if (this.redis.status !== 'ready' && this.reconnectAttempts === 0) {
        if (
          typeof this.rejectReady === 'function' &&
          !this.isReadyPromiseSettled
        ) {
          try {
            this.rejectReady(error);
            this.isReadyPromiseSettled = true;
          } catch (e) {
            this.logger.warn('Failed to reject readyPromise on error event', e);
          }
        }
      }
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.logger.warn(
        'RedisClient: Connection closed, attempting reconnect...',
      );
      if (
        typeof this.rejectReady === 'function' &&
        !this.isReadyPromiseSettled &&
        this.redis.status !== 'ready'
      ) {
        try {
          this.rejectReady(new Error('Redis connection closed before ready'));
          this.isReadyPromiseSettled = true;
        } catch (e) {
          this.logger.warn('Failed to reject readyPromise on close event', e);
        }
      }
    });

    this.redis.on('reconnecting', (time) => {
      this.reconnectAttempts++;
      this.logger.log(
        `RedisClient: Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}, Delay ${time}ms)`,
      );
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        this.logger.error(
          'RedisClient: Max reconnect attempts reached. Connection may be unstable.',
        );
        // 重置重連次數，允許繼續嘗試
        this.reconnectAttempts = 0;
      }
    });

    this.redis.on('end', () => {
      this.isConnected = false;
      this.logger.warn('RedisClient: Connection ended.');
      if (
        typeof this.rejectReady === 'function' &&
        !this.isReadyPromiseSettled &&
        this.redis.status !== 'ready'
      ) {
        try {
          this.rejectReady(new Error('Redis connection ended before ready'));
          this.isReadyPromiseSettled = true;
        } catch (e) {
          this.logger.warn('Failed to reject readyPromise on end event', e);
        }
      }
    });
  }

  /**
   * 判斷是否應該記錄錯誤（改進版本）
   */
  private shouldLogError(error: Error): boolean {
    const commonConnectionErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'Connection is closed',
      'connect ECONNREFUSED',
      'read ECONNRESET',
      'Command timed out',
    ];

    // 對於常見的連接錯誤，降低日誌級別
    const isCommonError = commonConnectionErrors.some((pattern) =>
      error.message.toLowerCase().includes(pattern.toLowerCase()),
    );

    // 🔑 簡化錯誤記錄邏輯
    return !isCommonError || this.reconnectAttempts <= 1;
  }

  /**
   * 獲取 Redis 實例
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * 檢查連接狀態
   */
  isReady(): boolean {
    return this.isConnected && this.redis && this.redis.status === 'ready';
  }

  /**
   * 安全執行 Redis 操作
   */
  async safeExecute<T>(
    operation: (client: Redis) => Promise<T>,
    fallback?: T,
  ): Promise<T> {
    await this.whenReady(); // 確保執行前已就緒
    // isReady() 檢查已包含在 whenReady() 中，或在此再次檢查以確保安全
    if (!this.isReady()) {
      this.logger.error('RedisClient is not ready for safeExecute');
      if (fallback !== undefined) return fallback;
      throw new Error('RedisClient is not ready to execute operation');
    }
    try {
      return await operation(this.redis);
    } catch (error) {
      this.logger.error(
        `RedisClient: Operation failed: ${error.message}`,
        error.stack,
      );
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  /**
   * 健康檢查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    if (!this.isReady()) {
      return { status: 'unhealthy', error: 'Redis client not ready' };
    }
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * 取得連接統計
   */
  getConnectionStats(): {
    status: string;
    isConnected: boolean;
    reconnectAttempts: number;
  } {
    return {
      status: this.redis ? this.redis.status : 'uninitialized',
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * 模組銷毀時清理連接
   */
  async onModuleDestroy(): Promise<void> {
    try {
      if (this.redis) {
        if (
          typeof this.rejectReady === 'function' &&
          !this.isReadyPromiseSettled
        ) {
          this.rejectReady(new Error('RedisClient is shutting down'));
          this.isReadyPromiseSettled = true;
        }
        await this.redis.quit();
        this.logger.log(
          'RedisClient: Connection safely closed on module destroy.',
        );
      }
    } catch (error) {
      this.logger.error(
        `RedisClient: Error closing connection on module destroy: ${error.message}`,
      );
    }
  }

  public async whenReady(): Promise<void> {
    if (this.isReady()) {
      return Promise.resolve();
    }
    return this.readyPromise;
  }
}

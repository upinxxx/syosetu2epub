import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis, Cluster } from 'ioredis';

/**
 * 統一的 Redis 服務
 * 提供單一連接池，改善連接穩定性，減少 ECONNRESET 錯誤
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.redis = this.createRedisConnection();
    this.setupEventHandlers();
  }

  /**
   * 建立 Redis 連接（優化配置）
   */
  private createRedisConnection(): Redis {
    const redisConfig = {
      host: this.configService.get('UPSTASH_REDIS_HOST'),
      port: this.configService.get('UPSTASH_REDIS_PORT'),
      username: this.configService.get('UPSTASH_REDIS_USERNAME'),
      password: this.configService.get('UPSTASH_REDIS_PASSWORD'),
      tls: {
        // 移除過於嚴格的 TLS 設定
        rejectUnauthorized: false,
      },
      // 優化連接設定以解決 ECONNRESET
      connectTimeout: 10000, // 10 秒連接超時
      lazyConnect: true, // 延遲連接
      maxRetriesPerRequest: 3, // Redis 客戶端可以保持重試機制
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: true, // 啟用離線佇列以提高穩定性
      keepAlive: 30000, // 30 秒 keep-alive
      // 連接池設定
      family: 4, // 強制 IPv4
      // 重連設定
      reconnectOnError: (err) => {
        const targetError =
          /READONLY|ECONNRESET|ETIMEDOUT|ENOTFOUND|ENETUNREACH/;
        return targetError.test(err.message);
      },
    };

    return new Redis(redisConfig);
  }

  /**
   * 設定事件處理器
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('Redis 統一服務連接成功');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis 統一服務準備就緒');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;

      // 過濾常見但不需要報警的錯誤
      if (this.shouldLogError(error)) {
        this.logger.error(`Redis 連接錯誤: ${error.message}`);
      } else {
        this.logger.debug(`Redis 網路錯誤（將自動重連）: ${error.message}`);
      }
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis 連接已關閉');
    });

    this.redis.on('reconnecting', (time) => {
      this.reconnectAttempts++;
      this.logger.log(
        `Redis 重新連接中... (第 ${this.reconnectAttempts} 次，延遲 ${time}ms)`,
      );

      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        this.logger.error('Redis 重連次數過多，請檢查網路連接');
      }
    });

    this.redis.on('end', () => {
      this.isConnected = false;
      this.logger.warn('Redis 連接已結束');
    });
  }

  /**
   * 判斷是否應該記錄錯誤
   */
  private shouldLogError(error: Error): boolean {
    const ignoredErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'Connection is closed',
    ];

    return !ignoredErrors.some((pattern) => error.message.includes(pattern));
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
    return this.isConnected && this.redis.status === 'ready';
  }

  /**
   * 安全執行 Redis 操作
   */
  async safeExecute<T>(
    operation: (client: Redis) => Promise<T>,
    fallback?: T,
  ): Promise<T> {
    try {
      if (!this.isReady()) {
        await this.redis.connect();
      }
      return await operation(this.redis);
    } catch (error) {
      this.logger.error(`Redis 操作失敗: ${error.message}`);
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
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
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
      status: this.redis.status,
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
        await this.redis.quit();
        this.logger.log('Redis 統一服務連接已安全關閉');
      }
    } catch (error) {
      this.logger.error(`關閉 Redis 連接時發生錯誤: ${error.message}`);
    }
  }
}

import { Injectable, Logger, Inject } from '@nestjs/common';
import { QUEUE_PORT_TOKEN, QueuePort } from '@/domain/ports/queue.port.js';
import { LOCK_PORT_TOKEN, LockPort } from '@/domain/ports/lock.port.js';

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  message?: string;
  details?: any;
}

export interface SystemHealthResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number;
  version: string;
  services: {
    redis: ServiceHealth;
    queue: ServiceHealth;
    lock: ServiceHealth;
  };
  metrics: {
    totalMemoryMB: number;
    usedMemoryMB: number;
    memoryUsagePercent: number;
  };
}

/**
 * 系統健康檢查用例
 * 負責檢查系統各項服務的健康狀態
 */
@Injectable()
export class SystemHealthCheckUseCase {
  private readonly logger = new Logger(SystemHealthCheckUseCase.name);
  private readonly startTime = Date.now();

  constructor(
    @Inject(QUEUE_PORT_TOKEN)
    private readonly queueService: QueuePort,
    @Inject(LOCK_PORT_TOKEN)
    private readonly lockService: LockPort,
  ) {}

  /**
   * 執行系統健康檢查
   */
  async execute(): Promise<SystemHealthResult> {
    this.logger.debug('執行系統健康檢查');
    const startTime = Date.now();

    try {
      // 並行執行各項檢查
      const [redisHealth, queueHealth, lockHealth] = await Promise.allSettled([
        this.checkRedisHealth(),
        this.checkQueueHealth(),
        this.checkLockHealth(),
      ]);

      const services = {
        redis: this.getHealthFromSettled(redisHealth),
        queue: this.getHealthFromSettled(queueHealth),
        lock: this.getHealthFromSettled(lockHealth),
      };

      // 計算總體健康狀態
      const overallStatus = this.calculateOverallStatus(services);

      // 獲取系統指標
      const metrics = this.getSystemMetrics();

      const result: SystemHealthResult = {
        status: overallStatus,
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        services,
        metrics,
      };

      const duration = Date.now() - startTime;
      this.logger.debug(
        `系統健康檢查完成，耗時: ${duration}ms, 狀態: ${overallStatus}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`系統健康檢查失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 檢查 Redis 健康狀態
   */
  private async checkRedisHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // 嘗試緩存一個測試值
      await this.queueService.cacheJobStatus('health-check', 'test', {
        jobId: 'test',
        status: 'QUEUED' as any,
        updatedAt: new Date(),
      });

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: 'Redis 連接正常',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: `Redis 連接失敗: ${error.message}`,
      };
    }
  }

  /**
   * 檢查佇列健康狀態
   */
  private async checkQueueHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // 嘗試獲取一個不存在的任務狀態（這會測試佇列連接）
      await this.queueService.getJobStatus('epub', 'health-check-test');

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: '佇列服務正常',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: `佇列服務失敗: ${error.message}`,
      };
    }
  }

  /**
   * 檢查分佈式鎖健康狀態
   */
  private async checkLockHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // 嘗試獲取和釋放一個測試鎖
      const testLockKey = `health-check-lock-${Date.now()}`;
      const releaseLock = await this.lockService.tryLock(testLockKey, 1000);

      if (releaseLock) {
        await releaseLock();
      }

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: '分佈式鎖服務正常',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: `分佈式鎖服務失敗: ${error.message}`,
      };
    }
  }

  /**
   * 從 Promise.allSettled 結果獲取健康狀態
   */
  private getHealthFromSettled(
    settled: PromiseSettledResult<ServiceHealth>,
  ): ServiceHealth {
    if (settled.status === 'fulfilled') {
      return settled.value;
    } else {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        message: `檢查失敗: ${settled.reason?.message || '未知錯誤'}`,
      };
    }
  }

  /**
   * 計算總體健康狀態
   */
  private calculateOverallStatus(
    services: Record<string, ServiceHealth>,
  ): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(services).map((s) => s.status);

    if (statuses.some((s) => s === 'unhealthy')) {
      return 'unhealthy';
    } else if (statuses.some((s) => s === 'degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * 獲取系統指標
   */
  private getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const totalMemoryMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usedMemoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    return {
      totalMemoryMB,
      usedMemoryMB,
      memoryUsagePercent: Math.round((usedMemoryMB / totalMemoryMB) * 100),
    };
  }
}

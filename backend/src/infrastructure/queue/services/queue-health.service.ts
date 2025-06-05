import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import {
  QueueHealthPort,
  HealthReport,
  QueueStatus,
  QueueMetrics,
} from '@/domain/ports/queue/queue-health.port.js';

/**
 * 佇列健康檢查服務
 * 負責系統健康檢查、失敗任務恢復、性能指標收集和連接狀態監控
 */
@Injectable()
export class QueueHealthService implements QueueHealthPort {
  private readonly logger = new Logger(QueueHealthService.name);
  private readonly queues: Map<string, Queue>;

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    @InjectQueue('epub')
    private readonly epubQueue: Queue,
    @InjectQueue('preview')
    private readonly previewQueue: Queue,
    @InjectQueue('kindle-delivery')
    private readonly kindleDeliveryQueue: Queue,
    // TODO: 暫時註解掉未使用的 queue
    // @InjectQueue('conversion')
    // private readonly conversionQueue: Queue,
    // @InjectQueue('health')
    // private readonly healthQueue: Queue,
  ) {
    // 初始化佇列映射
    this.queues = new Map<string, Queue>();
    this.queues.set('epub', epubQueue);
    this.queues.set('preview', previewQueue);
    this.queues.set('kindle-delivery', kindleDeliveryQueue);
    // TODO: 暫時註解掉未使用的 queue
    // this.queues.set('conversion', conversionQueue);
    // this.queues.set('health', healthQueue);

    this.logger.log('佇列健康檢查服務已初始化');
  }

  /**
   * 執行完整健康檢查
   */
  async performHealthCheck(): Promise<HealthReport> {
    const startTime = Date.now();

    try {
      const queueStatus = new Map<string, QueueStatus>();
      const errors: string[] = [];
      let failedJobsCount = 0;
      let pendingJobsCount = 0;

      // 檢查所有佇列狀態
      for (const [queueName, queue] of this.queues) {
        try {
          const status = await this.checkQueueStatus(queueName);
          queueStatus.set(queueName, status);
          failedJobsCount += status.failedCount;
          pendingJobsCount += status.waitingCount;
        } catch (error) {
          errors.push(`佇列 ${queueName} 檢查失敗: ${error.message}`);
        }
      }

      // 計算整體健康狀態
      const overallHealthy =
        Array.from(queueStatus.values()).every(
          (status) => status.isConnected,
        ) && errors.length === 0;

      const healthReport: HealthReport = {
        isHealthy: overallHealthy,
        timestamp: new Date(),
        queueStatus,
        failedJobsCount,
        pendingJobsCount,
        errors,
      };

      this.logger.log(
        `健康檢查完成: ${overallHealthy ? '健康' : '異常'} (耗時: ${Date.now() - startTime}ms)`,
      );
      return healthReport;
    } catch (error) {
      this.logger.error(`健康檢查失敗: ${error.message}`, error.stack);

      return {
        isHealthy: false,
        timestamp: new Date(),
        queueStatus: new Map(),
        failedJobsCount: 0,
        pendingJobsCount: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * 檢查特定佇列狀態
   */
  async checkQueueStatus(queueName: string): Promise<QueueStatus> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return {
          queueName,
          isConnected: false,
          waitingCount: 0,
          activeCount: 0,
          completedCount: 0,
          failedCount: 0,
        };
      }

      // 獲取佇列狀態統計
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      const status: QueueStatus = {
        queueName,
        isConnected: true,
        waitingCount: waiting.length,
        activeCount: active.length,
        completedCount: completed.length,
        failedCount: failed.length,
        lastActivity: new Date(),
      };

      return status;
    } catch (error) {
      this.logger.error(`檢查佇列 ${queueName} 狀態失敗: ${error.message}`);

      return {
        queueName,
        isConnected: false,
        waitingCount: 0,
        activeCount: 0,
        completedCount: 0,
        failedCount: 0,
      };
    }
  }

  /**
   * 恢復失敗任務
   */
  async recoverFailedJobs(
    queueName?: string,
    maxRetries: number = 3,
  ): Promise<number> {
    let recoveredCount = 0;

    try {
      const queues = queueName ? [queueName] : Array.from(this.queues.keys());

      for (const name of queues) {
        const queue = this.queues.get(name);
        if (!queue) continue;

        const failedJobs = await queue.getFailed();

        for (const job of failedJobs) {
          // 檢查重試次數
          if (job.attemptsMade < maxRetries) {
            try {
              await job.retry();
              recoveredCount++;
              this.logger.log(`已重試失敗任務: ${name}/${job.id}`);
            } catch (retryError) {
              this.logger.warn(
                `重試任務失敗: ${name}/${job.id} - ${retryError.message}`,
              );
            }
          }
        }
      }

      this.logger.log(`失敗任務恢復完成: 已恢復 ${recoveredCount} 個任務`);
      return recoveredCount;
    } catch (error) {
      this.logger.error(`恢復失敗任務時出錯: ${error.message}`, error.stack);
      return recoveredCount;
    }
  }

  /**
   * 獲取佇列指標
   */
  async getQueueMetrics(
    queueName: string,
    timeRange: number = 60,
  ): Promise<QueueMetrics> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`佇列 ${queueName} 未註冊`);
      }

      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      // 計算處理速率（每分鐘）
      const completedInTimeRange = completed.filter(
        (job) =>
          job.finishedOn &&
          Date.now() - job.finishedOn <= timeRange * 60 * 1000,
      );

      const throughputPerMinute = completedInTimeRange.length / timeRange;

      // 計算記憶體使用量
      const memoryUsage = process.memoryUsage();

      return {
        queueName,
        throughputPerMinute,
        averageProcessingTime: await this.calculateAverageProcessingTime(
          completed.slice(0, 100),
        ),
        errorRate:
          (failed.length / (completed.length + failed.length + 1)) * 100,
        memoryUsage: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
      };
    } catch (error) {
      this.logger.error(`獲取佇列指標失敗: ${queueName} - ${error.message}`);
      throw error;
    }
  }

  /**
   * 清理卡住的任務
   */
  async cleanupStalledJobs(
    queueName: string,
    maxAge: number = 1,
  ): Promise<number> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`佇列 ${queueName} 未註冊`);
      }

      const activeJobs = await queue.getActive();
      let cleanedCount = 0;
      const cutoffTime = Date.now() - maxAge * 60 * 60 * 1000; // 轉換為毫秒

      for (const job of activeJobs) {
        if (job.processedOn && job.processedOn < cutoffTime) {
          try {
            await job.moveToFailed(new Error('任務處理超時，已清理'), '0');
            cleanedCount++;
            this.logger.log(`已清理卡住任務: ${queueName}/${job.id}`);
          } catch (cleanupError) {
            this.logger.warn(
              `清理任務失敗: ${queueName}/${job.id} - ${cleanupError.message}`,
            );
          }
        }
      }

      this.logger.log(
        `卡住任務清理完成: ${queueName} (清理了 ${cleanedCount} 個任務)`,
      );
      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `清理卡住任務失敗: ${queueName} - ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * 重新連接佇列
   */
  async reconnectQueue(queueName: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`佇列 ${queueName} 未註冊`);
      }

      // BullMQ的佇列會自動重連，這裡主要是記錄和檢查
      await queue.waitUntilReady();
      this.logger.log(`佇列 ${queueName} 重新連接成功`);
    } catch (error) {
      this.logger.error(
        `重新連接佇列失敗: ${queueName} - ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 獲取系統指標
   */
  async getSystemMetrics(): Promise<{
    redis: {
      connected: boolean;
      memory: number;
      connections: number;
    };
    nodejs: {
      memory: NodeJS.MemoryUsage;
      uptime: number;
      version: string;
    };
  }> {
    const memoryUsage = process.memoryUsage();
    const redisConnected = await this.checkRedisConnection();

    return {
      redis: {
        connected: redisConnected,
        memory: 0, // 需要實際的Redis記憶體統計
        connections: 0, // 需要實際的Redis連接統計
      },
      nodejs: {
        memory: memoryUsage,
        uptime: process.uptime(),
        version: process.version,
      },
    };
  }

  /**
   * 檢查Redis連接狀態
   * @private
   */
  private async checkRedisConnection(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error(`Redis連接檢查失敗: ${error.message}`);
      return false;
    }
  }

  /**
   * 計算平均處理時間
   * @private
   */
  private async calculateAverageProcessingTime(jobs: any[]): Promise<number> {
    if (jobs.length === 0) return 0;

    const processingTimes = jobs
      .filter((job) => job.processedOn && job.finishedOn)
      .map((job) => job.finishedOn - job.processedOn);

    if (processingTimes.length === 0) return 0;

    const sum = processingTimes.reduce((acc, time) => acc + time, 0);
    return sum / processingTimes.length;
  }
}

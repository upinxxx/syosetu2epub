import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueueEvents } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QueueEventPort,
  EventHandlerResult,
} from '@/domain/ports/queue/queue-event.port.js';
import { QueueCachePort } from '@/domain/ports/queue/queue-cache.port.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

/**
 * 佇列事件處理器
 * 負責監聽和處理關鍵的佇列事件（completed, failed）
 * 移除了 active 和 stalled 事件以避免競態條件
 * 直接處理事件，無延遲機制，依靠終態保護防止狀態覆蓋
 */
@Injectable()
export class QueueEventHandler implements QueueEventPort {
  private readonly logger = new Logger(QueueEventHandler.name);
  private readonly queueEvents: Map<string, QueueEvents> = new Map();
  private readonly eventStats = new Map<
    string,
    {
      completedCount: number;
      failedCount: number;
      lastEventTime?: Date;
    }
  >();

  constructor(
    @Inject('QUEUE_CACHE_SERVICE')
    private readonly cacheService: QueueCachePort,
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
    this.initializeEventStats();
    this.setupEventListeners();
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners(): void {
    const queueConfigs = [
      { name: 'epub', queue: this.epubQueue },
      { name: 'preview', queue: this.previewQueue },
      { name: 'kindle-delivery', queue: this.kindleDeliveryQueue },
      // TODO: 暫時註解掉未使用的 queue
      // { name: 'conversion', queue: this.conversionQueue },
      // { name: 'health', queue: this.healthQueue },
    ];

    for (const { name, queue } of queueConfigs) {
      this.setupQueueEventListeners(name, queue);
    }

    this.logger.log('所有佇列事件監聽器已設置');
  }

  /**
   * 處理任務完成事件
   */
  async handleJobCompleted(
    queueName: string,
    jobId: string,
    result?: any,
  ): Promise<EventHandlerResult> {
    try {
      this.logger.log(`任務完成事件: ${queueName}/${jobId}`);

      // 直接設置完成狀態，無延遲機制
      await this.cacheService.cacheJobStatus(queueName, jobId, {
        jobId,
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date(),
      });

      // 更新統計
      this.updateEventStats(queueName, 'completed');

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`處理任務完成事件失敗: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 處理任務失敗事件
   */
  async handleJobFailed(
    queueName: string,
    jobId: string,
    error: string,
  ): Promise<EventHandlerResult> {
    try {
      this.logger.warn(`任務失敗事件: ${queueName}/${jobId} - ${error}`);

      // 直接設置失敗狀態，無延遲機制
      await this.cacheService.cacheJobStatus(queueName, jobId, {
        jobId,
        status: JobStatus.FAILED,
        errorMessage: error,
        updatedAt: new Date(),
      });

      // 更新統計
      this.updateEventStats(queueName, 'failed');

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (processingError) {
      this.logger.error(
        `處理任務失敗事件失敗: ${processingError.message}`,
        processingError.stack,
      );
      return {
        success: false,
        error: processingError.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 停止事件監聽器
   */
  async stopEventListeners(queueName?: string): Promise<void> {
    if (queueName) {
      const queueEvents = this.queueEvents.get(queueName);
      if (queueEvents) {
        await queueEvents.close();
        this.queueEvents.delete(queueName);
        this.logger.log(`已停止 ${queueName} 佇列事件監聽器`);
      }
    } else {
      // 停止所有監聽器
      for (const [name, queueEvents] of this.queueEvents) {
        await queueEvents.close();
        this.logger.log(`已停止 ${name} 佇列事件監聽器`);
      }
      this.queueEvents.clear();
    }
  }

  /**
   * 獲取事件統計
   */
  async getEventStats(queueName: string): Promise<{
    completedCount: number;
    failedCount: number;
    lastEventTime?: Date;
  }> {
    return (
      this.eventStats.get(queueName) || {
        completedCount: 0,
        failedCount: 0,
      }
    );
  }

  /**
   * 重設事件監聽器
   */
  async resetEventListeners(queueName: string): Promise<void> {
    await this.stopEventListeners(queueName);

    // 重新建立對應的佇列事件監聽器
    const queueMap = new Map([
      ['epub', this.epubQueue],
      ['preview', this.previewQueue],
      ['kindle-delivery', this.kindleDeliveryQueue],
      // TODO: 暫時註解掉未使用的 queue
      // ['conversion', this.conversionQueue],
      // ['health', this.healthQueue],
    ]);

    const queue = queueMap.get(queueName);
    if (queue) {
      this.setupQueueEventListeners(queueName, queue);
      this.logger.log(`已重設 ${queueName} 佇列事件監聽器`);
    }
  }

  /**
   * 為特定佇列設置事件監聽器
   * @private
   */
  private setupQueueEventListeners(queueName: string, queue: Queue): void {
    const queueEvents = new QueueEvents(queueName, {
      connection: queue.opts.connection,
    });

    // 僅監聽關鍵事件，移除 active 和 stalled 事件以避免競態條件
    queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      await this.handleJobCompleted(queueName, jobId, returnvalue);
    });

    queueEvents.on('failed', async ({ jobId, failedReason }) => {
      await this.handleJobFailed(queueName, jobId, failedReason);
    });

    this.queueEvents.set(queueName, queueEvents);
    this.logger.log(
      `已設置 ${queueName} 佇列事件監聽器（僅 completed/failed 事件）`,
    );
  }

  /**
   * 初始化事件統計
   * @private
   */
  private initializeEventStats(): void {
    const queueNames = [
      'epub',
      'preview',
      'kindle-delivery',
      // TODO: 暫時註解掉未使用的 queue
      // 'conversion',
      // 'health',
    ];
    for (const queueName of queueNames) {
      this.eventStats.set(queueName, {
        completedCount: 0,
        failedCount: 0,
      });
    }
  }

  /**
   * 更新事件統計
   * @private
   */
  private updateEventStats(
    queueName: string,
    eventType: 'completed' | 'failed',
  ): void {
    const stats = this.eventStats.get(queueName);
    if (stats) {
      if (eventType === 'completed') {
        stats.completedCount++;
      } else {
        stats.failedCount++;
      }
      stats.lastEventTime = new Date();
    }
  }
}

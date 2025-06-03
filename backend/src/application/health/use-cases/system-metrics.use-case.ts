import { Injectable, Logger } from '@nestjs/common';

export interface SystemMetricsResult {
  timestamp: Date;
  uptime: number;
  memory: {
    total: number;
    used: number;
    usagePercent: number;
  };
  process: {
    pid: number;
    nodeVersion: string;
    platform: string;
    cpuUsage: NodeJS.CpuUsage;
  };
}

/**
 * 系統指標查詢用例
 * 負責收集和返回系統運行指標
 */
@Injectable()
export class SystemMetricsUseCase {
  private readonly logger = new Logger(SystemMetricsUseCase.name);
  private readonly startTime = Date.now();

  constructor() {}

  /**
   * 獲取系統指標
   */
  async execute(): Promise<SystemMetricsResult> {
    this.logger.debug('獲取系統指標');

    try {
      const memoryMetrics = this.getMemoryMetrics();
      const processMetrics = this.getProcessMetrics();

      return {
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        memory: memoryMetrics,
        process: processMetrics,
      };
    } catch (error) {
      this.logger.error(`獲取系統指標失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 獲取記憶體指標
   */
  private getMemoryMetrics() {
    const memUsage = process.memoryUsage();
    const totalMemoryMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usedMemoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    return {
      total: totalMemoryMB,
      used: usedMemoryMB,
      usagePercent: Math.round((usedMemoryMB / totalMemoryMB) * 100),
    };
  }

  /**
   * 獲取程序指標
   */
  private getProcessMetrics() {
    return {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      cpuUsage: process.cpuUsage(),
    };
  }
}

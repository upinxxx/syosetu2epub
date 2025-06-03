import { Controller, Get, HttpStatus } from '@nestjs/common';
import { RedisService } from '@/infrastructure/redis/redis.service.js';

/**
 * 健康檢查控制器
 * 提供系統各組件的健康狀態檢查
 */
@Controller('health')
export class HealthController {
  constructor(private readonly redisService: RedisService) {}

  /**
   * 基本健康檢查
   */
  @Get()
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Redis 連接健康檢查
   */
  @Get('redis')
  async redisHealthCheck() {
    const healthResult = await this.redisService.healthCheck();
    const connectionStats = this.redisService.getConnectionStats();

    return {
      ...healthResult,
      connectionStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 詳細系統健康檢查
   */
  @Get('detailed')
  async detailedHealthCheck() {
    const redisHealth = await this.redisService.healthCheck();
    const redisStats = this.redisService.getConnectionStats();
    const memoryUsage = process.memoryUsage();

    return {
      status: redisHealth.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        redis: {
          ...redisHealth,
          connectionStats: redisStats,
        },
        nodejs: {
          status: 'healthy',
          uptime: process.uptime(),
          version: process.version,
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024),
          },
        },
      },
    };
  }
}

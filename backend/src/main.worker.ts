import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker/worker.module.js';

// 載入 Worker 專用環境變數
// dotenv.config({ path: '.env' }); // 由 WorkerModule 中的 ConfigModule.forRoot 處理

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  logger.log('正在啟動 EPUB 轉換 Worker...');

  // 使用 createApplicationContext 而非 create，因為 Worker 不需要 HTTP 伺服器
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['error', 'warn'],
  });

  // 設置全局前綴
  logger.log('EPUB 轉換 Worker 已啟動並開始監聽隊列');

  // 優雅關閉處理
  app.enableShutdownHooks();

  // 處理未捕獲的異常
  process.on('uncaughtException', (error) => {
    logger.error(`未捕獲的異常: ${error.message}`, error.stack);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error(`未處理的 Promise 拒絕: ${reason}`);
  });
}

bootstrap();

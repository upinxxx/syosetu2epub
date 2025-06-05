// ===== CRYPTO POLYFILL FOR NODE.JS 18 ESM =====
// 解決 @nestjs/typeorm 在 Node.js 18 ESM 模式下的 crypto 模組問題
import { webcrypto } from 'node:crypto';
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto as Crypto;
}
// ============================================

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

// 載入 API 專用環境變數

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // 指定使用 Express 應用程式
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['error', 'warn', 'log', 'verbose', 'debug'],
  });
  const configService = app.get(ConfigService);

  // 設置全域 API 前綴
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/quick', 'health/metrics'],
  });
  logger.log('已設置全域 API 前綴: /api/v1/');

  // 全局啟用 cookie 解析
  app.use(cookieParser());

  // 啟用 CORS
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  // 允許多個來源
  const corsOrigins = [
    'http://localhost:5173', // Vite 開發伺服器
    'http://127.0.0.1:5173', // 備用 IP
    'http://localhost:4173', // Vite 預覽伺服器
  ];

  logger.log(`配置 CORS，允許來源: ${corsOrigins.join(', ')}`);

  app.enableCors({
    origin: isProduction ? corsOrigins : true, // 開發環境允許所有來源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  });

  // 啟用驗證
  app.useGlobalPipes(new ValidationPipe());

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`API 服務已啟動，監聽端口: ${port}`);
  logger.log('API 端點格式: http://0.0.0.0:' + port + '/api/v1/*');
}
bootstrap();

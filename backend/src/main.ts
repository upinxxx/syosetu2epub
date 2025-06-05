import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import './config/env-validation.js'; // 引入環境變數驗證

// 載入 API 專用環境變數

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // 指定使用 Express 應用程式
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['error', 'warn'],
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
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  });

  // 啟用驗證
  app.useGlobalPipes(new ValidationPipe());

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  logger.log(`API 服務已啟動，監聽端口: ${port}`);
  logger.log('API 端點格式: http://localhost:' + port + '/api/v1/*');
}
bootstrap();

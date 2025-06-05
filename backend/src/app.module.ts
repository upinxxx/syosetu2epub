import {
  Module,
  MiddlewareConsumer,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { NovelOrmEntity } from './infrastructure/entities/novel.orm-entity.js';
import { EpubJobOrmEntity } from './infrastructure/entities/epub-job.orm-entity.js';
import { UserOrmEntity } from './infrastructure/entities/user.orm-entity.js';
import { KindleDeliveryOrmEntity } from './infrastructure/entities/kindle-delivery.orm-entity.js';
import { InfrastructureModule } from './infrastructure/infrastructure.module.js';
import { ApplicationModule } from './application/application.module.js';
import { HttpModule } from './presentation/http.module.js';
import { SharedModule } from './shared/shared.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { ResponseFormatInterceptor } from './shared/interceptors/response-format.interceptor.js';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor.js';
import { PerformanceMonitoringInterceptor } from './shared/interceptors/performance-monitoring.interceptor.js';
import { DomainExceptionFilter } from './shared/filters/domain-exception.filter.js';
import { ApiMonitoringMiddleware } from './shared/middleware/api-monitoring.middleware.js';
import cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';

/**
 * 應用程式主模組
 * 整合所有層級的模組，並提供全局配置
 */
@Module({
  imports: [
    // 基礎配置模塊
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 定時任務模塊
    ScheduleModule.forRoot(),

    // 數據庫配置
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('DB_HOST');
        const port = configService.get<number>('DB_PORT');
        const username = configService.get<string>('DB_USERNAME');
        const password = configService.get<string>('DB_PASSWORD');
        const database = configService.get<string>('DB_DATABASE');
        const synchronize =
          configService.get<boolean>('DB_SYNCHRONIZE') || false;
        const logging = configService.get<boolean>('DB_LOGGING') || false;

        if (!host || !port || !username || !password || !database) {
          throw new Error('Database configuration not found');
        }

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities: [
            NovelOrmEntity,
            EpubJobOrmEntity,
            UserOrmEntity,
            KindleDeliveryOrmEntity,
          ],
          synchronize,
          logging,
        };
      },
    }),

    // 共用組件模組（全域）
    SharedModule,

    // 六角形架構各層模組
    InfrastructureModule, // 基礎設施層：適配器實現
    ApplicationModule, // 應用層：用例和服務
    HttpModule, // 表現層：控制器和路由
    RedisModule,
  ],
  providers: [
    // 註冊全域驗證管道
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },

    // 🆕 註冊全域性能監控攔截器（第一個執行）
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceMonitoringInterceptor,
    },

    // 註冊全域日誌攔截器
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // 註冊全域回應格式攔截器
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseFormatInterceptor,
    },

    // 註冊全域異常過濾器
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 註冊 API 監控中介軟體（應用於所有路由）
    consumer.apply(ApiMonitoringMiddleware).forRoutes('*');

    // 增加詳細的 cookie 解析選項
    consumer.apply(cookieParser()).forRoutes('*');

    // 添加調試中間件（僅在開發環境）
    if (process.env.NODE_ENV !== 'production') {
      consumer
        .apply((req: any, res: any, next: () => void) => {
          const logger = new Logger('HttpDebug');
          logger.debug(`Incoming request: ${req.method} ${req.url}`);
          if (Object.keys(req.cookies).length > 0) {
            logger.debug(`Cookies: ${JSON.stringify(req.cookies)}`);
          }
          // 增加響應完成事件的監聽
          res.on('finish', () => {
            logger.debug(`Response status: ${res.statusCode}`);
          });
          next();
        })
        .forRoutes('*');
    }
  }
}

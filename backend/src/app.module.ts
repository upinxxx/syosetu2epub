import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NovelOrmEntity } from './infrastructure/entities/novel.orm-entity.js';
import { EpubJobOrmEntity } from './infrastructure/entities/epub-job.orm-entity.js';
import { UserOrmEntity } from './infrastructure/entities/user.orm-entity.js';
import { KindleDeliveryOrmEntity } from './infrastructure/entities/kindle-delivery.orm-entity.js';
import { InfrastructureModule } from './infrastructure/infrastructure.module.js';
import { ApplicationModule } from './application/application.module.js';
import { HttpModule } from './presentation/http.module.js';
import cookieParser from 'cookie-parser';

/**
 * 應用程式主模組
 * 整合所有層級的模組，並提供全局配置
 */
@Module({
  imports: [
    // 基礎配置模塊
    ConfigModule.forRoot({ isGlobal: true }),

    // 定時任務模塊
    ScheduleModule.forRoot(),

    // 數據庫配置
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [
          NovelOrmEntity,
          EpubJobOrmEntity,
          UserOrmEntity,
          KindleDeliveryOrmEntity,
        ],
        synchronize: false,
      }),
    }),

    // 六角形架構各層模組
    InfrastructureModule, // 基礎設施層：適配器實現
    ApplicationModule, // 應用層：用例和服務
    HttpModule, // 表現層：控制器和路由
  ],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes('*');
  }
}

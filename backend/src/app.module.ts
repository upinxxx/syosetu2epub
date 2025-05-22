import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NovelOrmEntity } from './infrastructure/entities/novel.orm-entity.js';
import { EpubJobOrmEntity } from './shared/dto/epub-job.orm-entity.js';
import { UserOrmEntity } from './infrastructure/entities/user.orm-entity.js';
import { EmailLogOrmEntity } from './infrastructure/entities/email-log.orm-entity.js';
import { InfrastructureModule } from './infrastructure/infrastructure.module.js';
import { ApplicationModule } from './application/application.module.js';
import { HttpModule } from './presentation/http.module.js';

/**
 * 應用程式主模組
 * 整合所有層級的模組，並提供全局配置
 */
@Module({
  imports: [
    // 基礎配置模塊
    ConfigModule.forRoot({ isGlobal: true }),

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
          EmailLogOrmEntity,
        ],
        synchronize: false,
      }),
    }),

    // 六角形架構各層模組
    InfrastructureModule, // 基礎設施層：適配器實現
    ApplicationModule, // 應用層：用例和服務
    HttpModule, // 表現層：控制器和路由
  ],
})
export class AppModule {}

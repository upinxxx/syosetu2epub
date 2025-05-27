import { Module } from '@nestjs/common';
import { NovelController } from './novel.controller.js';
import { ApplicationModule } from '@/application/application.module.js';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module.js';
import { AuthController } from './auth.controller.js';
import { PassportModule } from '@nestjs/passport';
import { AuthInfrastructureModule } from '@/infrastructure/auth/auth.infrastructure.module.js';
import { KindleDeliveryController } from './kindle-delivery.controller.js';

/**
 * HTTP 模組
 * 彙總所有 HTTP 控制器，並注入所需的 Facade
 */
@Module({
  imports: [
    // 核心層與基礎設施層模組
    InfrastructureModule, // 導入基礎設施層模組
    ApplicationModule, // 導入應用層模組（包含所有子域模組）

    // Passport 認證框架
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // 認證相關基礎設施
    AuthInfrastructureModule,
  ],
  controllers: [
    NovelController, // 小說相關控制器
    AuthController, // 認證相關控制器
    KindleDeliveryController, // Kindle 交付控制器
  ],
})
export class HttpModule {}

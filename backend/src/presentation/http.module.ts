import { Module } from '@nestjs/common';
import { NovelController } from './http/controllers/novel.controller.js';
import { ConversionController } from './http/controllers/conversion.controller.js';
import { AuthController } from './http/controllers/auth.controller.js';
import { KindleDeliveryController } from './http/controllers/kindle-delivery.controller.js';
import { UserController } from '@/presentation/http/controllers/user.controller.js';
import {
  HealthController,
  HealthMetricsController,
} from './http/controllers/health.controller.js';
import { PassportModule } from '@nestjs/passport';
import { PreviewModule } from '@/application/preview/preview.module.js';
import { ConvertModule } from '@/application/convert/convert.module.js';
import { AuthModule } from '@/application/auth/auth.module.js';
import { KindleDeliveryModule } from '@/application/kindle-delivery/kindle-delivery.module.js';
import { HealthModule } from '@/application/health/health.module.js';
import { UserModule } from '@/application/user/user.module.js';

/**
 * HTTP 模組
 * 彙總所有 HTTP 控制器，並注入所需的 Facade
 */
@Module({
  imports: [
    // 直接引入所需的應用層子模組，而不是整個 ApplicationModule
    PreviewModule,
    ConvertModule,
    AuthModule,
    KindleDeliveryModule,
    HealthModule, // 健康檢查模組
    UserModule,

    // Passport 認證框架
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    NovelController, // 小說預覽相關控制器
    ConversionController, // 轉檔相關控制器
    AuthController, // 認證相關控制器
    KindleDeliveryController, // Kindle 交付控制器
    UserController, // 用戶相關控制器
    HealthController, // 健康檢查控制器 (無前綴)
    HealthMetricsController, // 健康檢查指標控制器 (有前綴)
  ],
  providers: [],
})
export class HttpModule {}

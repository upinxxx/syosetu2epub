import { Module } from '@nestjs/common';
import { NovelController } from './novel.controller.js';
import { AuthController } from './auth.controller.js';
import { KindleDeliveryController } from './kindle-delivery.controller.js';
import { PassportModule } from '@nestjs/passport';
import { PreviewModule } from '@/application/preview/preview.module.js';
import { ConvertModule } from '@/application/convert/convert.module.js';
import { AuthModule } from '@/application/auth/auth.module.js';
import { KindleDeliveryModule } from '@/application/kindle-delivery/kindle-delivery.module.js';
import { JobsModule } from '@/application/jobs/jobs.module.js';

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
    JobsModule,

    // Passport 認證框架
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    NovelController, // 小說相關控制器
    AuthController, // 認證相關控制器
    KindleDeliveryController, // Kindle 交付控制器
  ],
  providers: [],
})
export class HttpModule {}

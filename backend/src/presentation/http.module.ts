import { Module } from '@nestjs/common';
import { NovelController } from './novel.controller.js';
import { UseCasesModule } from '../application/use-cases/use-cases.module.js';
import { ApplicationModule } from '@/application/application.module.js';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module.js';

/**
 * HTTP 模組
 * 彙總所有 HTTP 控制器，並注入所需的 Use Cases
 */
@Module({
  imports: [
    InfrastructureModule, // 導入基礎設施層模組
    ApplicationModule, // 導入應用層模組
    UseCasesModule, // 導入所有 Use Cases
  ],
  controllers: [
    NovelController, // 註冊 NovelController
    // 未來可以添加更多控制器
  ],
})
export class HttpModule {}

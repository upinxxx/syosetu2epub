import { Module } from '@nestjs/common';
import { UseCasesModule } from './use-cases/use-cases.module.js';
import { InfrastructureModule } from '../infrastructure/infrastructure.module.js';
/**
 * 應用層模組
 * 整合所有使用案例，並依賴於基礎設施模組
 */
@Module({
  imports: [
    InfrastructureModule, // 導入基礎設施模組
    UseCasesModule, // 導入所有 Use Case
  ],
  exports: [
    UseCasesModule, // 導出所有 Use Case
  ],
})
export class ApplicationModule {}

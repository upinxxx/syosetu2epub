import { Module, Global } from '@nestjs/common';
import { UserContextService } from './services/user-context.service.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { DomainExceptionFilter } from './filters/domain-exception.filter.js';

/**
 * 共用模組
 * 統一管理跨模組使用的共用組件
 * 使用 @Global() 裝飾器讓所有模組都能使用
 */
@Global()
@Module({
  providers: [
    // 用戶上下文服務（REQUEST scoped）
    UserContextService,

    // 日誌攔截器
    LoggingInterceptor,

    // Domain 異常過濾器
    DomainExceptionFilter,
  ],
  exports: [
    // 導出供其他模組使用
    UserContextService,
    LoggingInterceptor,
    DomainExceptionFilter,
  ],
})
export class SharedModule {}

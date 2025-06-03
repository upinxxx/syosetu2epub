import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * 日誌攔截器
 * 統一處理請求日誌記錄、requestId 生成和執行時間追蹤
 *
 * 功能包括：
 * 1. 自動生成 requestId
 * 2. 記錄請求開始和完成
 * 3. 計算執行時間
 * 4. 記錄方法名稱和類別名稱
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const requestId = this.generateRequestId();

    // 獲取執行上下文信息
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;
    const contextType = context.getType();

    // 根據上下文類型獲取請求信息
    let requestInfo = '';
    if (contextType === 'http') {
      const request = context.switchToHttp().getRequest();
      requestInfo = `${request.method} ${request.url}`;
    } else {
      requestInfo = `${className}.${handlerName}`;
    }

    // 將 requestId 加入到 request 對象中，供後續使用
    if (contextType === 'http') {
      const request = context.switchToHttp().getRequest();
      request.requestId = requestId;
    }

    this.logger.debug(
      `[${requestId}] 開始執行 ${requestInfo} - ${className}.${handlerName}`,
    );

    return next.handle().pipe(
      tap({
        next: (result) => {
          const duration = Date.now() - now;
          this.logger.debug(
            `[${requestId}] 完成執行 ${requestInfo} - ${className}.${handlerName}, 執行時間: ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `[${requestId}] 執行失敗 ${requestInfo} - ${className}.${handlerName}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }

  /**
   * 生成唯一的請求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

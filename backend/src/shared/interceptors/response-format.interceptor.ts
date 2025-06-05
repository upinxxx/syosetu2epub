import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * 統一 API 回應格式介面
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

/**
 * API 錯誤回應格式介面
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * 統一回應格式攔截器
 * 確保所有 API 回應都遵循統一的格式
 */
@Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseFormatInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const isHealthCheck = request.url?.startsWith('/health');

    // 健康檢查端點跳過格式化
    if (isHealthCheck) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // 調試日誌：記錄原始響應數據
        if (process.env.NODE_ENV !== 'production') {
          this.logger.debug(
            `原始響應數據 (${request.method} ${request.url}): ${JSON.stringify(data)}`,
          );
        }

        // 如果回應已經是標準格式，確保包含 timestamp 並直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          const formattedResponse = {
            ...data,
            timestamp: new Date().toISOString(),
          };

          if (process.env.NODE_ENV !== 'production') {
            this.logger.debug(
              `已是標準格式，添加 timestamp: ${JSON.stringify(formattedResponse)}`,
            );
          }

          return formattedResponse;
        }

        // 格式化為標準成功回應
        const standardResponse: ApiResponse = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };

        if (process.env.NODE_ENV !== 'production') {
          this.logger.debug(
            `轉換為標準格式: ${JSON.stringify(standardResponse)}`,
          );
        }

        return standardResponse;
      }),
      catchError((error) => {
        this.logger.error(
          `API 請求處理失敗 (${request.method} ${request.url}): ${error.message}`,
          error.stack,
        );

        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: error.code || error.name || 'INTERNAL_ERROR',
            message: error.message || '內部伺服器錯誤',
            details: error.details || undefined,
          },
          timestamp: new Date().toISOString(),
        };

        return throwError(() => errorResponse);
      }),
    );
  }
}

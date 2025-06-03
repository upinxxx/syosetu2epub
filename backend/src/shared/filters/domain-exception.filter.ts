import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * Domain 錯誤基類
 * 所有 Domain 層錯誤都應該繼承此類
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

/**
 * Facade 錯誤基類（用於向後相容）
 */
export class FacadeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'FacadeError';
  }
}

/**
 * Domain 異常過濾器
 * 統一處理 Domain 錯誤並轉換為適當的 HTTP 回應
 *
 * 處理的錯誤類型：
 * 1. DomainError - 業務邏輯錯誤
 * 2. FacadeError - Facade 層錯誤（向後相容）
 * 3. HttpException - NestJS 內建 HTTP 錯誤
 * 4. 其他未知錯誤 - 轉換為 500 錯誤
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 獲取 requestId（如果有的話）
    const requestId = (request as any).requestId || 'unknown';

    let status: number;
    let code: string;
    let message: string;
    let details: any = null;

    // 根據異常類型進行分類處理
    if (exception instanceof DomainError) {
      // Domain 層錯誤
      const mappedStatus = this.mapDomainErrorToHttpStatus(exception.code);
      status = mappedStatus;
      code = exception.code;
      message = exception.message;
      details = exception.details;

      this.logger.warn(
        `[${requestId}] Domain 錯誤: ${code} - ${message}`,
        exception.stack,
      );
    } else if (exception instanceof FacadeError) {
      // Facade 層錯誤（向後相容）
      status = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.details;

      this.logger.warn(
        `[${requestId}] Facade 錯誤: ${code} - ${message}`,
        exception.stack,
      );
    } else if (exception instanceof HttpException) {
      // NestJS HTTP 異常
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const errorResponse = response as any;
        code = errorResponse.error || 'HTTP_EXCEPTION';
        message = errorResponse.message || exception.message;
        details = errorResponse.details || null;
      } else {
        code = 'HTTP_EXCEPTION';
        message = exception.message;
      }

      this.logger.warn(
        `[${requestId}] HTTP 異常: ${status} - ${message}`,
        exception.stack,
      );
    } else if (exception instanceof Error) {
      // 其他已知錯誤
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_SERVER_ERROR';
      message =
        process.env.NODE_ENV === 'production'
          ? '伺服器內部錯誤'
          : exception.message;
      details =
        process.env.NODE_ENV === 'production'
          ? null
          : { originalError: exception.message };

      this.logger.error(
        `[${requestId}] 未處理錯誤: ${exception.message}`,
        exception.stack,
      );
    } else {
      // 未知錯誤
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'UNKNOWN_ERROR';
      message = '發生未知錯誤';

      this.logger.error(`[${requestId}] 未知錯誤類型:`, exception);
    }

    // 構建統一的錯誤回應格式
    const errorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(requestId !== 'unknown' && { requestId }),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * 將 Domain 錯誤代碼映射到 HTTP 狀態碼
   */
  private mapDomainErrorToHttpStatus(errorCode: string): number {
    const errorMappings: Record<string, number> = {
      // 客戶端錯誤 (4xx)
      INVALID_NOVEL_ID: HttpStatus.BAD_REQUEST,
      INVALID_JOB_ID: HttpStatus.BAD_REQUEST,
      INVALID_USER_ID: HttpStatus.BAD_REQUEST,
      INVALID_SOURCE_ID: HttpStatus.BAD_REQUEST,
      INVALID_NOVEL_SOURCE: HttpStatus.BAD_REQUEST,
      INVALID_NAROU_ID_FORMAT: HttpStatus.BAD_REQUEST,
      INVALID_JOB_DATA: HttpStatus.BAD_REQUEST,
      INVALID_PAGINATION_PARAMS: HttpStatus.BAD_REQUEST,

      // 未找到錯誤 (404)
      JOB_NOT_FOUND: HttpStatus.NOT_FOUND,
      NOVEL_NOT_FOUND: HttpStatus.NOT_FOUND,
      USER_NOT_FOUND: HttpStatus.NOT_FOUND,
      PREVIEW_NOT_FOUND: HttpStatus.NOT_FOUND,

      // 認證錯誤 (401)
      UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
      INVALID_TOKEN: HttpStatus.UNAUTHORIZED,

      // 權限錯誤 (403)
      FORBIDDEN: HttpStatus.FORBIDDEN,
      ACCESS_DENIED: HttpStatus.FORBIDDEN,

      // 衝突錯誤 (409)
      JOB_ALREADY_EXISTS: HttpStatus.CONFLICT,
      DUPLICATE_ENTRY: HttpStatus.CONFLICT,

      // 業務邏輯錯誤 (422)
      JOB_NOT_READY: HttpStatus.UNPROCESSABLE_ENTITY,
      INVALID_JOB_STATUS: HttpStatus.UNPROCESSABLE_ENTITY,

      // 外部服務錯誤 (502)
      EXTERNAL_SERVICE_ERROR: HttpStatus.BAD_GATEWAY,
      CRAWLER_ERROR: HttpStatus.BAD_GATEWAY,

      // 服務不可用 (503)
      SERVICE_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
      QUEUE_FULL: HttpStatus.SERVICE_UNAVAILABLE,
    };

    return errorMappings[errorCode] || HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

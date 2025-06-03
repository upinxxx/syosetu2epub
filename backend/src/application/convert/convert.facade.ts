import { Inject, Injectable, Logger } from '@nestjs/common';
import { SubmitEpubJobUseCase } from './use-cases/submit-epub-job.use-case.js';
import {
  ProcessEpubJobUseCase,
  ProcessJobData,
} from './use-cases/process-epub-job.use-case.js';
import { GetEpubJobStatusUseCase } from './use-cases/get-epub-job-status.use-case.js';
import { GetDownloadLinkUseCase } from './use-cases/get-download-link.use-case.js';
import { GenerateEpubUseCase } from './use-cases/generate-epub.use-case.js';
import { GetUserJobHistoryUseCase } from './use-cases/get-user-job-history.use-case.js';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';

// 新增錯誤類型定義
class ConvertFacadeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'ConvertFacadeError';
  }
}

/**
 * 轉換功能門面
 * 向外提供轉換相關的功能，隱藏內部實現細節
 * 增強版本：統一錯誤處理、改善身份識別、詳細日誌記錄
 */
@Injectable()
export class ConvertFacade {
  private readonly logger = new Logger(ConvertFacade.name);

  constructor(
    @Inject(SubmitEpubJobUseCase)
    private readonly submitEpubJob: SubmitEpubJobUseCase,
    @Inject(ProcessEpubJobUseCase)
    private readonly processEpubJob: ProcessEpubJobUseCase,
    @Inject(GetEpubJobStatusUseCase)
    private readonly getEpubJobStatus: GetEpubJobStatusUseCase,
    @Inject(GetDownloadLinkUseCase)
    private readonly getDownloadLink: GetDownloadLinkUseCase,
    @Inject(GenerateEpubUseCase)
    private readonly generateEpub: GenerateEpubUseCase,
    @Inject(GetUserJobHistoryUseCase)
    private readonly getUserJobHistoryUseCase: GetUserJobHistoryUseCase,
  ) {}

  /**
   * 提交轉換任務
   * @param novelId 小說ID
   * @param userInfo 用戶信息對象 (來自身份驗證)
   */
  async submitJob(novelId: string, userInfo: any) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    this.logger.log(
      `[${requestId}] 開始提交轉換任務 - novelId: ${novelId}, 執行時間: ${new Date().toISOString()}`,
    );

    try {
      // 驗證參數
      if (
        !novelId ||
        typeof novelId !== 'string' ||
        novelId.trim().length === 0
      ) {
        throw new ConvertFacadeError(
          '小說ID不能為空',
          'INVALID_NOVEL_ID',
          400,
          { novelId, type: typeof novelId },
        );
      }

      // 提取並驗證用戶ID
      const userIdentity = this.extractAndValidateUserIdentity(
        userInfo,
        requestId,
      );

      this.logger.log(
        `[${requestId}] 用戶身份確認 - ${userIdentity.isAuthenticated ? `已登入用戶: ${userIdentity.userId}` : '匿名用戶'}`,
      );

      // 執行業務邏輯
      const result = await this.submitEpubJob.execute(
        novelId,
        userIdentity.userId,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] 轉換任務提交成功 - jobId: ${result.jobId}, 執行時間: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 轉換任務提交失敗 - 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      // 統一錯誤格式
      if (error instanceof ConvertFacadeError) {
        throw error;
      }

      throw new ConvertFacadeError(
        '轉換任務提交失敗',
        'SUBMIT_JOB_FAILED',
        500,
        {
          originalError: error.message,
          novelId,
          requestId,
        },
      );
    }
  }

  /**
   * 處理轉換任務
   * @param jobData 任務數據
   */
  async processJob(jobData: ProcessJobData) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] 開始處理轉換任務 - jobId: ${jobData.jobId}`,
    );

    try {
      // 驗證任務數據
      if (!jobData || !jobData.jobId) {
        throw new ConvertFacadeError('任務數據無效', 'INVALID_JOB_DATA', 400, {
          jobData,
        });
      }

      const result = await this.processEpubJob.execute(jobData);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] 轉換任務處理完成 - jobId: ${jobData.jobId}, 執行時間: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 轉換任務處理失敗 - jobId: ${jobData.jobId}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      throw new ConvertFacadeError(
        '轉換任務處理失敗',
        'PROCESS_JOB_FAILED',
        500,
        {
          originalError: error.message,
          jobId: jobData.jobId,
          requestId,
        },
      );
    }
  }

  /**
   * 獲取任務狀態
   * @param jobId 任務ID
   */
  async getJobStatus(jobId: string) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.debug(`[${requestId}] 查詢任務狀態 - jobId: ${jobId}`);

    try {
      if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
        throw new ConvertFacadeError('任務ID不能為空', 'INVALID_JOB_ID', 400, {
          jobId,
          type: typeof jobId,
        });
      }

      const result = await this.getEpubJobStatus.execute(jobId);

      const duration = Date.now() - startTime;
      this.logger.debug(
        `[${requestId}] 任務狀態查詢完成 - jobId: ${jobId}, status: ${result.status}, 執行時間: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 任務狀態查詢失敗 - jobId: ${jobId}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      throw new ConvertFacadeError(
        '任務狀態查詢失敗',
        'GET_JOB_STATUS_FAILED',
        500,
        {
          originalError: error.message,
          jobId,
          requestId,
        },
      );
    }
  }

  /**
   * 獲取下載連結
   * @param jobId 任務ID
   */
  async getDownloadUrl(jobId: string) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(`[${requestId}] 獲取下載連結 - jobId: ${jobId}`);

    try {
      if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
        throw new ConvertFacadeError('任務ID不能為空', 'INVALID_JOB_ID', 400, {
          jobId,
          type: typeof jobId,
        });
      }

      const result = await this.getDownloadLink.execute(jobId);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] 下載連結獲取成功 - jobId: ${jobId}, 執行時間: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 下載連結獲取失敗 - jobId: ${jobId}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      throw new ConvertFacadeError(
        '下載連結獲取失敗',
        'GET_DOWNLOAD_URL_FAILED',
        500,
        {
          originalError: error.message,
          jobId,
          requestId,
        },
      );
    }
  }

  /**
   * 生成 EPUB 文件
   * @param novelUrl 小說URL
   * @param source 小說來源
   */
  async generateEpubFile(novelUrl: string, source: NovelSource) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] 開始生成EPUB文件 - URL: ${novelUrl}, source: ${source}`,
    );

    try {
      if (
        !novelUrl ||
        typeof novelUrl !== 'string' ||
        novelUrl.trim().length === 0
      ) {
        throw new ConvertFacadeError(
          '小說URL不能為空',
          'INVALID_NOVEL_URL',
          400,
          { novelUrl, type: typeof novelUrl },
        );
      }

      if (!source || !Object.values(NovelSource).includes(source)) {
        throw new ConvertFacadeError(
          '小說來源無效',
          'INVALID_NOVEL_SOURCE',
          400,
          { source, validSources: Object.values(NovelSource) },
        );
      }

      const result = await this.generateEpub.execute(novelUrl, source);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] EPUB文件生成完成 - URL: ${novelUrl}, 執行時間: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] EPUB文件生成失敗 - URL: ${novelUrl}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      throw new ConvertFacadeError(
        'EPUB文件生成失敗',
        'GENERATE_EPUB_FAILED',
        500,
        {
          originalError: error.message,
          novelUrl,
          source,
          requestId,
        },
      );
    }
  }

  /**
   * 增強的用戶身份識別和驗證邏輯
   * @param userInfo 來自認證策略的用戶信息
   * @param requestId 請求ID（用於日誌追蹤）
   * @returns 標準化的用戶身份信息
   */
  private extractAndValidateUserIdentity(
    userInfo: any,
    requestId: string,
  ): {
    userId: string | null;
    isAuthenticated: boolean;
    identitySource: string;
  } {
    this.logger.debug(
      `[${requestId}] 開始用戶身份識別，原始數據: ${JSON.stringify(userInfo)}`,
    );

    // 處理 null 或 undefined 的情況（匿名用戶）
    if (!userInfo) {
      this.logger.debug(`[${requestId}] 用戶信息為空，判定為匿名用戶`);
      return {
        userId: null,
        isAuthenticated: false,
        identitySource: 'anonymous',
      };
    }

    // 檢查用戶信息的類型
    if (typeof userInfo !== 'object') {
      this.logger.warn(
        `[${requestId}] 用戶信息類型異常: ${typeof userInfo}，當作匿名用戶處理`,
      );
      return {
        userId: null,
        isAuthenticated: false,
        identitySource: 'invalid_type',
      };
    }

    // 按優先級嘗試提取用戶ID
    const extractionMethods = [
      { field: 'sub', source: 'jwt_strategy' }, // JWT 策略標準欄位
      { field: 'id', source: 'user_entity' }, // 用戶實體ID
      { field: 'userId', source: 'legacy_format' }, // 舊格式用戶ID
      { field: 'user_id', source: 'snake_case' }, // 蛇形命名
    ];

    for (const method of extractionMethods) {
      const value = userInfo[method.field];
      if (value && typeof value === 'string') {
        const userId = value.trim();
        if (userId.length > 0) {
          this.logger.debug(
            `[${requestId}] 成功從 ${method.field} 欄位提取用戶ID: ${userId} (來源: ${method.source})`,
          );

          // 驗證用戶ID格式（UUID或其他合法格式）
          if (this.isValidUserId(userId)) {
            return {
              userId,
              isAuthenticated: true,
              identitySource: method.source,
            };
          } else {
            this.logger.warn(
              `[${requestId}] 用戶ID格式無效: ${userId} (來源: ${method.source})`,
            );
          }
        }
      }
    }

    // 如果無法提取有效的用戶ID，記錄詳細信息
    const availableFields = Object.keys(userInfo).join(', ');
    this.logger.warn(
      `[${requestId}] 無法提取有效用戶ID，當作匿名用戶處理。` +
        `可用欄位: ${availableFields}，` +
        `用戶信息: ${JSON.stringify(userInfo)}`,
    );

    return {
      userId: null,
      isAuthenticated: false,
      identitySource: 'extraction_failed',
    };
  }

  /**
   * 驗證用戶ID格式是否合法
   * @param userId 用戶ID
   * @returns 是否為合法格式
   */
  private isValidUserId(userId: string): boolean {
    // UUID格式驗證
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // 其他可接受的格式（可根據需要調整）
    const otherValidFormats = [
      /^[a-zA-Z0-9_-]{8,64}$/, // 8-64位字母數字和符號
    ];

    return (
      uuidRegex.test(userId) ||
      otherValidFormats.some((regex) => regex.test(userId))
    );
  }

  /**
   * 生成請求ID用於日誌追蹤
   * @returns 唯一的請求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 獲取用戶任務歷史
   * @param userId 用戶ID
   * @param page 頁碼
   * @param limit 每頁數量
   */
  async getUserJobHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] 獲取用戶任務歷史 - userId: ${userId}, page: ${page}, limit: ${limit}`,
    );

    try {
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new ConvertFacadeError('用戶ID不能為空', 'INVALID_USER_ID', 400, {
          userId,
          type: typeof userId,
        });
      }

      if (page < 1 || limit < 1 || limit > 100) {
        throw new ConvertFacadeError(
          '分頁參數無效',
          'INVALID_PAGINATION_PARAMS',
          400,
          { page, limit },
        );
      }

      const result = await this.getUserJobHistoryUseCase.execute(
        userId,
        page,
        limit,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] 用戶任務歷史獲取成功 - userId: ${userId}, 總計: ${result.pagination.total} 項, 執行時間: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 用戶任務歷史獲取失敗 - userId: ${userId}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      if (error instanceof ConvertFacadeError) {
        throw error;
      }

      throw new ConvertFacadeError(
        '用戶任務歷史獲取失敗',
        'GET_USER_JOB_HISTORY_FAILED',
        500,
        {
          originalError: error.message,
          userId,
          page,
          limit,
          requestId,
        },
      );
    }
  }

  /**
   * 獲取用戶最近任務
   * @param userId 用戶ID
   * @param limit 數量限制
   */
  async getUserRecentJobs(userId: string, limit: number = 5) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] 獲取用戶最近任務 - userId: ${userId}, limit: ${limit}`,
    );

    try {
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new ConvertFacadeError('用戶ID不能為空', 'INVALID_USER_ID', 400, {
          userId,
          type: typeof userId,
        });
      }

      if (limit < 1 || limit > 50) {
        throw new ConvertFacadeError(
          '數量限制無效',
          'INVALID_LIMIT_PARAM',
          400,
          { limit },
        );
      }

      const result = await this.getUserJobHistoryUseCase.getRecentJobs(
        userId,
        limit,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${requestId}] 用戶最近任務獲取成功 - userId: ${userId}, 總計: ${result.length} 項, 執行時間: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] 用戶最近任務獲取失敗 - userId: ${userId}, 執行時間: ${duration}ms, 錯誤: ${error.message}`,
        error.stack,
      );

      if (error instanceof ConvertFacadeError) {
        throw error;
      }

      throw new ConvertFacadeError(
        '用戶最近任務獲取失敗',
        'GET_USER_RECENT_JOBS_FAILED',
        500,
        {
          originalError: error.message,
          userId,
          limit,
          requestId,
        },
      );
    }
  }
}

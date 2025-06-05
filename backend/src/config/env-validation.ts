import { Logger } from '@nestjs/common';

/**
 * 後端環境變數驗證
 * 確保部署時所有必要的環境變數都已正確設定
 */

interface EnvironmentConfig {
  // 應用程式基本配置
  NODE_ENV: string;
  PORT: number;

  // 資料庫配置
  SUPABASE_DB_URL?: string;
  DB_URL?: string;

  // Redis 配置
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_USERNAME?: string;
  REDIS_PASSWORD?: string;

  // JWT 配置
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;

  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;

  // Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_STORAGE_BUCKET?: string;

  // 前端配置
  FRONTEND_URL?: string;
  CORS_ORIGINS?: string;

  // Email 服務
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;

  // Cookie 配置
  COOKIE_DOMAIN?: string;
}

export class EnvValidator {
  private static readonly logger = new Logger(EnvValidator.name);

  /**
   * 驗證所有必要的環境變數
   */
  static validate(): EnvironmentConfig {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必需的環境變數
    const requiredVars = [
      'JWT_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_CALLBACK_URL',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
    ];

    // 檢查必需變數
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`缺少必需的環境變數: ${varName}`);
      }
    }

    // 檢查資料庫配置
    if (!process.env.SUPABASE_DB_URL && !process.env.DB_URL) {
      errors.push('必須設定資料庫連接: SUPABASE_DB_URL 或 DB_URL');
    }

    // 檢查 Redis 配置
    if (!process.env.REDIS_HOST && !process.env.UPSTASH_REDIS_URL) {
      warnings.push('未設定 Redis 配置，BullMQ 可能無法正常工作');
    }

    // 檢查生產環境配置
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      if (!process.env.FRONTEND_URL) {
        warnings.push('生產環境建議設定 FRONTEND_URL');
      }
      if (!process.env.COOKIE_DOMAIN) {
        warnings.push('生產環境建議設定 COOKIE_DOMAIN');
      }
      if (!process.env.RESEND_API_KEY) {
        warnings.push('生產環境建議設定 RESEND_API_KEY');
      }
    }

    // 驗證 JWT_SECRET 強度
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      warnings.push('JWT_SECRET 長度建議至少 32 字元');
    }

    // 驗證 Google Callback URL 格式
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
    if (callbackUrl && !callbackUrl.includes('/api/v1/auth/google/callback')) {
      warnings.push('Google Callback URL 應包含 /api/v1/auth/google/callback');
    }

    // 報告結果
    if (errors.length > 0) {
      this.logger.error('❌ 環境變數驗證失敗:');
      errors.forEach((error) => this.logger.error(`  - ${error}`));
      throw new Error(`環境變數配置錯誤: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      this.logger.warn('⚠️ 環境變數警告:');
      warnings.forEach((warning) => this.logger.warn(`  - ${warning}`));
    }

    this.logger.log('✅ 環境變數驗證通過');

    // 返回配置物件
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: parseInt(process.env.PORT || '3000', 10),

      SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
      DB_URL: process.env.DB_URL,

      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT
        ? parseInt(process.env.REDIS_PORT, 10)
        : undefined,
      REDIS_USERNAME: process.env.REDIS_USERNAME,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,

      JWT_SECRET: process.env.JWT_SECRET!,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
      JWT_ISSUER: process.env.JWT_ISSUER,
      JWT_AUDIENCE: process.env.JWT_AUDIENCE,

      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
      GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL!,

      SUPABASE_URL: process.env.SUPABASE_URL!,
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,
      SUPABASE_STORAGE_BUCKET:
        process.env.SUPABASE_STORAGE_BUCKET || 'epub-files',

      FRONTEND_URL: process.env.FRONTEND_URL,
      CORS_ORIGINS: process.env.CORS_ORIGINS,

      RESEND_API_KEY: process.env.RESEND_API_KEY,
      FROM_EMAIL: process.env.FROM_EMAIL,

      COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    };
  }

  /**
   * 記錄環境配置摘要（不包含敏感資訊）
   */
  static logConfigSummary(): void {
    const config = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HAS_DB_CONFIG: !!(process.env.SUPABASE_DB_URL || process.env.DB_URL),
      HAS_REDIS_CONFIG: !!(
        process.env.REDIS_HOST || process.env.UPSTASH_REDIS_URL
      ),
      HAS_JWT_SECRET: !!process.env.JWT_SECRET,
      HAS_GOOGLE_OAUTH: !!(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
      HAS_SUPABASE_CONFIG: !!(
        process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
      ),
      HAS_EMAIL_CONFIG: !!process.env.RESEND_API_KEY,
      FRONTEND_URL: process.env.FRONTEND_URL,
    };

    this.logger.log('🔧 環境配置摘要:', JSON.stringify(config, null, 2));
  }
}

// 自動驗證（在開發環境）
if (process.env.NODE_ENV !== 'test') {
  try {
    EnvValidator.validate();
    EnvValidator.logConfigSummary();
  } catch (error) {
    console.error('環境變數驗證失敗:', error.message);
    process.exit(1);
  }
}

import { registerAs } from '@nestjs/config';

/**
 * Resend 配置
 * 包含 Resend API 金鑰和寄件人電子郵件設定
 */
export default registerAs('resend', () => ({
  apiKey: process.env.RESEND_API_KEY,
  fromEmail:
    process.env.RESEND_FROM_EMAIL || 'noreply@kindle.syosetu2epub.online',
}));

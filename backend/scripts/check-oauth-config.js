#!/usr/bin/env node

/**
 * Google OAuth 配置檢查腳本
 * 用於驗證 Google OAuth 相關的環境變數配置
 */

import * as dotenv from 'dotenv';
import chalk from 'chalk';

// 載入環境變數
dotenv.config({ path: '.env.api' });

// console.log(chalk.bold.blue('🔍 Google OAuth 配置檢查'));
// console.log(`時間: ${new Date().toLocaleString()}\n`);

const requiredVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'JWT_SECRET',
  'FRONTEND_URL',
];

const config = {};
let hasErrors = false;

// console.log(chalk.bold.yellow('=== 環境變數檢查 ==='));

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  config[varName] = value;

  if (!value) {
    // console.log(`${chalk.red('✗')} ${varName}: ${chalk.red('未設定')}`);
    hasErrors = true;
  } else {
    // 隱藏敏感資訊
    const displayValue =
      varName.includes('SECRET') || varName.includes('ID')
        ? `${value.substring(0, 8)}...`
        : value;
    // console.log(`${chalk.green('✓')} ${varName}: ${chalk.green(displayValue)}`);
  }
});

// console.log(`\n${chalk.bold.yellow('=== 配置驗證 ===')}`);

// 檢查回調 URL 格式
if (config.GOOGLE_CALLBACK_URL) {
  const callbackUrl = config.GOOGLE_CALLBACK_URL;
  const expectedPattern = /\/api\/v1\/auth\/google\/callback$/;

  if (expectedPattern.test(callbackUrl)) {
    // console.log(`${chalk.green('✓')} 回調 URL 格式正確: ${callbackUrl}`);
  } else {
    // console.log(`${chalk.red('✗')} 回調 URL 格式錯誤: ${callbackUrl}`);
    // console.log(
    //   `${chalk.yellow('   應該以 /api/v1/auth/google/callback 結尾')}`,
    // );
    hasErrors = true;
  }
} else {
  // console.log(`${chalk.red('✗')} 回調 URL 未設定`);
  hasErrors = true;
}

// 檢查前端 URL
if (config.FRONTEND_URL) {
  try {
    new URL(config.FRONTEND_URL);
    // console.log(
    //   `${chalk.green('✓')} 前端 URL 格式正確: ${config.FRONTEND_URL}`,
    // );
  } catch (error) {
    // console.log(`${chalk.red('✗')} 前端 URL 格式錯誤: ${config.FRONTEND_URL}`);
    hasErrors = true;
  }
} else {
  // console.log(
  //   `${chalk.yellow('⚠')} 前端 URL 未設定，將使用預設值: http://localhost:5173`,
  // );
}

// 檢查 JWT Secret 長度
if (config.JWT_SECRET) {
  if (config.JWT_SECRET.length >= 32) {
    console.log(`${chalk.green('✓')} JWT Secret 長度足夠`);
  } else {
    console.log(
      `${chalk.yellow('⚠')} JWT Secret 長度較短 (${config.JWT_SECRET.length} 字符)，建議至少 32 字符`,
    );
  }
}

// console.log(`\n${chalk.bold.yellow('=== 建議檢查清單 ===')}`);
// console.log(`1. ${chalk.cyan('Google Cloud Console 設定:')}`);
// console.log(`   - 登入 https://console.cloud.google.com/`);
// console.log(`   - 導航至 APIs & Services > Credentials`);
// console.log(`   - 找到您的 OAuth 2.0 客戶端 ID`);
// console.log(
//   `   - 確認 "授權重定向 URI" 包含: ${config.GOOGLE_CALLBACK_URL || '[請先設定 GOOGLE_CALLBACK_URL]'}`,
// );
// console.log(`\n2. ${chalk.cyan('本地測試:')}`);
// console.log(`   - 啟動後端服務: pnpm run dev`);
// console.log(
//   `   - 測試 OAuth 流程: 訪問 http://localhost:3000/api/v1/auth/google`,
// );
// console.log(`   - 檢查是否成功重定向到 Google 登入頁面`);
// console.log(`\n3. ${chalk.cyan('路由驗證:')}`);
// console.log(`   - 執行路由測試: pnpm run verify:routes`);
// console.log(`   - 檢查健康檢查端點: curl http://localhost:3000/health`);
if (hasErrors) {
  // console.log(`\n${chalk.red('❌ 發現配置問題，請修正後重新檢查')}`);
  process.exit(1);
} else {
  // console.log(`\n${chalk.green('✅ 配置檢查通過！')}`);
  process.exit(0);
}

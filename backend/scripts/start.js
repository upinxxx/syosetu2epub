#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 獲取當前檔案的目錄
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 檢查環境變數決定啟動模式
const APP_MODE = process.env.APP_MODE || 'api';

console.log(`🚀 啟動模式: ${APP_MODE}`);

// 根據模式啟動不同的進程
let startCommand;
let startArgs;

switch (APP_MODE) {
  case 'worker':
    console.log('📦 啟動 EPUB Worker 進程...');
    startCommand = 'node';
    startArgs = ['dist/main.worker.js'];
    break;

  case 'api':
  default:
    console.log('🌐 啟動 API 服務器...');
    startCommand = 'node';
    startArgs = ['dist/main.js'];
    break;
}

// 設置進程選項
const options = {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production',
  },
};

// 啟動進程
const child = spawn(startCommand, startArgs, options);

// 處理進程事件
child.on('error', (error) => {
  console.error(`❌ 進程啟動失敗: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`⚠️  進程被信號 ${signal} 終止`);
  } else {
    console.log(`🔚 進程退出，代碼: ${code}`);
  }
  process.exit(code || 0);
});

// 優雅關閉處理
process.on('SIGTERM', () => {
  console.log('🛑 收到 SIGTERM 信號，正在關閉...');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 收到 SIGINT 信號，正在關閉...');
  child.kill('SIGINT');
});

console.log(`✅ ${APP_MODE.toUpperCase()} 服務已啟動 (PID: ${child.pid})`);

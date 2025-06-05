#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 驗證 EPUB 模板檔案是否正確複製到 dist 目錄
 */

const requiredTemplates = [
  'dist/infrastructure/epub-generator/templates/custom-toc.xhtml.ejs',
  'dist/infrastructure/epub-generator/templates/custom.opf.ejs',
];

console.log('🔍 驗證 EPUB 模板檔案...');

let hasErrors = false;

for (const templatePath of requiredTemplates) {
  const fullPath = path.resolve(process.cwd(), templatePath);

  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`✅ ${templatePath} (${stats.size} bytes)`);

    // 檢查檔案內容是否為空
    if (stats.size === 0) {
      console.error(`❌ ${templatePath} 檔案為空`);
      hasErrors = true;
    }
  } else {
    console.error(`❌ ${templatePath} 檔案不存在`);
    hasErrors = true;
  }
}

// 檢查模板目錄結構
const templateDir = 'dist/infrastructure/epub-generator/templates';
if (fs.existsSync(templateDir)) {
  const files = fs.readdirSync(templateDir);
  console.log(`📁 模板目錄包含 ${files.length} 個檔案:`, files.join(', '));
} else {
  console.error(`❌ 模板目錄不存在: ${templateDir}`);
  hasErrors = true;
}

// 驗證結果
if (hasErrors) {
  console.error('\n❌ EPUB 模板檔案驗證失敗！');
  console.error('請確認：');
  console.error('1. pnpm run build 是否成功執行');
  console.error('2. copy-assets.js 腳本是否正常運作');
  console.error(
    '3. 來源模板檔案是否存在於 src/infrastructure/epub-generator/templates/',
  );
  process.exit(1);
} else {
  console.log('\n✅ EPUB 模板檔案驗證通過！');
  console.log('🎉 部署可以繼續進行');
}

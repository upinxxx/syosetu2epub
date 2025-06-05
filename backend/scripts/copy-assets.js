import fs from 'fs';
import path from 'path';

const filesToCopy = [
  {
    from: 'src/infrastructure/epub-generator/templates/custom-toc.xhtml.ejs',
    to: 'dist/infrastructure/epub-generator/templates/custom-toc.xhtml.ejs',
  },
  {
    from: 'src/infrastructure/epub-generator/templates/custom.opf.ejs',
    to: 'dist/infrastructure/epub-generator/templates/custom.opf.ejs',
  },
  // 可以再加其他
];

console.log('🔧 開始複製 EPUB 模板檔案...');

for (const file of filesToCopy) {
  try {
    // 檢查來源檔案是否存在
    if (!fs.existsSync(file.from)) {
      console.error(`❌ 來源檔案不存在: ${file.from}`);
      process.exit(1);
    }

    const targetDir = path.dirname(file.to);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(file.from, file.to);
    console.log(`✅ 複製成功: ${file.from} → ${file.to}`);
  } catch (error) {
    console.error(`❌ 複製失敗: ${file.from}`, error.message);
    process.exit(1);
  }
}

console.log('🎉 所有 EPUB 模板檔案複製完成！');

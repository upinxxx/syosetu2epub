import fs from 'fs';
import path from 'path';

const filesToCopy = [
  {
    from: 'src/epub/templates/custom-toc.xhtml.ejs',
    to: 'dist/epub/templates/custom-toc.xhtml.ejs',
  },
  // 可以再加其他
];

for (const file of filesToCopy) {
  const targetDir = path.dirname(file.to);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(file.from, file.to);
  console.log(`✔ Copied ${file.from} → ${file.to}`);
}

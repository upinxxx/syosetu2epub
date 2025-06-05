# 使用官方 Node.js 18 Alpine 映像作為基礎
FROM node:18-alpine AS base

# 設定工作目錄
WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安裝依賴
RUN pnpm install --frozen-lockfile

# 複製原始程式碼和模板檔案
COPY . .

# 構建應用程式 (包含 copy-assets.js 複製模板檔案)
RUN pnpm run build

# 驗證模板檔案是否已複製
RUN ls -la dist/infrastructure/epub-generator/templates/ || echo "模板目錄不存在"

# 生產階段
FROM node:18-alpine AS production

# 設定工作目錄
WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 只複製 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安裝生產依賴
RUN pnpm install --frozen-lockfile --prod

# 從構建階段複製構建結果和腳本
COPY --from=base /app/dist ./dist
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/node_modules ./node_modules

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=8080

# 暴露端口
EXPOSE 8080

# 智能啟動 - 根據 APP_MODE 環境變數決定啟動哪個服務
CMD ["node", "scripts/start.js"] 
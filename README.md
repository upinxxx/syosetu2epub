# Syosetu2EPUB

## 📖 專案簡介

Syosetu2EPUB 是一個全棧應用程式，允許使用者輸入小說網站的 URL（初始支援日本小說網站如「小説家になろう」和「カクヨム」等），自動抓取內容並轉換為 EPUB 電子書格式，最後提供下載連結。系統支援非同步處理，會將轉換任務加入佇列並在背景處理，完成後提供下載連結。

### 🌟 主要功能

- 📚 從網路小說網站抓取內容
- 📖 生成格式優美的 EPUB 電子書
- 👀 提供小說預覽功能
- ⚡ 使用佇列系統處理耗時任務
- 📥 任務完成後提供下載連結
- 📱 支援直接轉寄 EPUB 到 Kindle 閱讀器（僅會員功能）
- 🔐 使用 Google 帳號登入
- 🏗️ 遵循六角架構設計原則
- 🔄 統一的 API v1 規範

## 🏛️ 專案架構

本專案採用 **六角架構（Hexagonal / Ports & Adapters）**，並在 Application 層導入 **子域 + Facade** 模式，確保清晰的依賴關係和高度可測試性。

### 🔄 API v1 統一規範

- **API 前綴**: `/api/v1/` (除健康檢查端點外)
- **統一回應格式**: 所有 API 都遵循 `{ success: boolean, data: T, timestamp: string }` 格式
- **錯誤處理**: 統一的錯誤代碼和訊息格式
- **監控**: 內建 API 請求監控和統計
- **認證**: JWT Token 通過 HTTP-Only Cookie 傳遞

### 📁 後端架構

```
backend/src/
├─ domain/                        # 🎯 核心：純商務實體與 Port 介面
│  ├─ entities/
│  └─ ports/
│
├─ application/                   # 🔧 應用層：子域 + Facade + Use‑Cases
│  ├─ auth/
│  │   ├─ auth.module.ts
│  │   ├─ auth.facade.ts          # 統一入口，內部呼叫 Use‑Cases
│  │   └─ use-cases/
│  │
│  ├─ convert/
│  │   ├─ convert.module.ts
│  │   ├─ convert.facade.ts       # 轉檔功能統一門面
│  │   └─ use-cases/
│  │
│  ├─ preview/
│  │   ├─ preview.module.ts
│  │   ├─ preview.facade.ts       # 預覽功能統一門面
│  │   └─ use-cases/
│  │
│  ├─ kindle-delivery/
│  │   ├─ kindle-delivery.module.ts
│  │   ├─ kindle-delivery.facade.ts
│  │   └─ use-cases/
│  │
│  └─ health/
│      ├─ health.module.ts
│      ├─ health.facade.ts        # 健康檢查統一門面
│      └─ use-cases/
│
├─ infrastructure/                # 🔌 具體適配器 (DB / Queue / Mail / Storage)
│  ├─ crawler/
│  ├─ email/
│  ├─ queue/                      # BullMQ 連線與封裝
│  ├─ storage/
│  └─ repositories/
│
├─ presentation/                  # 🌐 HTTP 入站介面 (Controllers)
│  ├─ auth.controller.ts          # 認證相關 API
│  ├─ user.controller.ts          # 用戶相關 API
│  ├─ novel.controller.ts         # 小說相關 API
│  ├─ conversion.controller.ts    # 轉檔相關 API
│  ├─ kindle-delivery.controller.ts # Kindle 相關 API
│  └─ health.controller.ts        # 健康檢查 API
│
├─ shared/                        # 🛠️ 共享組件
│  ├─ interceptors/
│  │   └─ response-format.interceptor.ts  # 統一回應格式
│  └─ middleware/
│      └─ api-monitoring.middleware.ts    # API 監控
│
└─ worker/                        # ⚙️ 背景任務處理進程
   ├─ epub-queue.processor.ts
   └─ preview-queue.processor.ts
```

### 🎨 前端架構

```
frontend/src/
├─ components/             # 🧩 UI元件
├─ pages/                  # 📄 頁面元件
├─ lib/                    # 🔧 通用庫和工具函數
│  ├─ api-client.ts       # 統一 API 客戶端
│  └─ contexts/           # React Context
└─ assets/                # 🖼️ 靜態資源
```

### 🔄 依賴流向

```
Presentation → Application → Domain
Infrastructure → Domain (僅 Port 介面)
```

**重要原則**：

- ✅ Controllers 僅依賴 Facade
- ✅ Facade 編排 Use Cases
- ✅ Use Cases 包含純業務邏輯
- ✅ Infrastructure 實作 Domain Ports

## 🛠️ 技術棧

### 後端技術

- **框架**: NestJS + TypeScript
- **數據庫**: PostgreSQL(Supabase) + TypeORM
- **佇列系統**: BullMQ + Upstash Redis
- **存儲服務**: Supabase Storage
- **電子書生成**: 自定義 EPUB 生成器
- **認證**: Google OAuth + JWT
- **郵件服務**: Resend
- **部署環境**: GCP + Docker

### 前端技術

- **框架**: React + TypeScript
- **構建工具**: Vite
- **UI 庫**: Tailwind CSS + Shadcn UI
- **狀態管理**: React Context API
- **HTTP 客戶端**: 統一 API Client
- **部署環境**: Vercel

### 開發工具

- **包管理器**: pnpm
- **版本控制**: Git
- **CI/CD**: GitHub Actions
- **代碼質量**: ESLint, Prettier
- **模組系統**: ESM

## 📊 功能狀態

### ✅ 已完成功能

- ✅ **API v1 統一規範**: 統一前綴、回應格式、錯誤處理
- ✅ **六角架構重構**: 清晰的層級分離和依賴管理
- ✅ **API 監控**: 請求統計、錯誤率、回應時間監控
- ✅ **小說 URL 預覽功能**: 支援 Narou 和 Kakuyomu
- ✅ **EPUB 轉換功能**: 遊客和會員都可使用
- ✅ **佇列系統**: BullMQ 處理非同步任務
- ✅ **Google OAuth 登入**: 安全的用戶認證
- ✅ **Kindle 交付功能**: 直接發送到 Kindle 設備
- ✅ **用戶任務歷史**: 完整的任務追蹤記錄
- ✅ **統一 API 客戶端**: 前端統一的 API 調用

### 🔄 進行中功能

- 🔄 多語言支援
- 🔄 添加更多小說網站支援
- 🔄 API 限流與安全性強化
- 🔄 性能優化和快取策略

## 🚀 API v1 端點總覽

### 🔐 認證相關

- `GET /api/v1/auth/google` - Google OAuth 登入
- `GET /api/v1/auth/google/callback` - OAuth 回調
- `GET /api/v1/auth/me` - 獲取當前用戶
- `POST /api/v1/auth/logout` - 用戶登出

### 👤 用戶相關

- `GET /api/v1/users/profile` - 獲取用戶資料
- `PUT /api/v1/users/profile` - 更新用戶資料
- `GET /api/v1/users/job-history` - 獲取任務歷史
- `GET /api/v1/users/recent-jobs` - 獲取最近任務

### 📚 小說相關

- `POST /api/v1/novels/preview` - 預覽小說
- `GET /api/v1/novels/preview/:jobId` - 獲取預覽狀態
- `GET /api/v1/novels/:id/preview` - 根據 ID 獲取預覽

### 🔄 轉檔相關

- `POST /api/v1/conversions` - 提交轉檔任務
- `GET /api/v1/conversions/:jobId` - 獲取轉檔狀態
- `GET /api/v1/conversions/:jobId/file` - 獲取下載連結

### 📱 Kindle 相關

- `POST /api/v1/kindle/deliveries` - 發送到 Kindle
- `GET /api/v1/kindle/deliveries/:id` - 獲取交付狀態
- `GET /api/v1/kindle/deliveries` - 獲取交付歷史

## 🔧 本地開發設定

### 📋 環境需求

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- Redis 6+

### 🚀 快速開始

1. **克隆專案**

```bash
git clone https://github.com/your-username/syosetu2epub.git
cd syosetu2epub
```

2. **安裝依賴**

```bash
# 後端
cd backend
pnpm install
```

```bash
# 前端
cd frontend
pnpm install
```

3. **設定環境變數**

後端環境變數 (`backend/.env`):

```env
# 資料庫設定
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=syosetu2epub

# Redis 設定
REDIS_URL=redis://localhost:6379

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT 設定
JWT_SECRET=your_jwt_secret

# Supabase 設定
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_SERVICE_key

# Resend 設定
RESEND_API_KEY=your_resend_api_key
```

前端環境變數 (`frontend/.env`):

```env
VITE_API_BASE=http://localhost:3000
```

4. **啟動服務**

```bash
# 啟動後端 (在 backend 目錄)
pnpm run dev

# 啟動前端 (在 frontend 目錄)
pnpm run vite
```

5. **訪問應用**

- 前端: http://localhost:5173
- 後端 API: http://localhost:3000

**版本**: v1.0.0  
**最後更新**: 2025-6-5  
**維護者**: Syosetu2EPUB 開發團隊

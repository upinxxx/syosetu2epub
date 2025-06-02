# Syosetu2EPUB

## 專案簡介

Syosetu2EPUB 是一個全棧應用程式，允許使用者輸入小說網站的 URL（初始支援日本小說網站如「小説家になろう」和「カクヨム」等），自動抓取內容並轉換為 EPUB 電子書格式，最後提供下載連結。系統支援非同步處理，會將轉換任務加入佇列並在背景處理，完成後提供下載連結。

主要功能：

- 從網路小說網站抓取內容
- 生成格式優美的 EPUB 電子書
- 提供小說預覽功能
- 使用佇列系統處理耗時任務
- 任務完成後提供下載連結
- 支援直接轉寄 EPUB 到 Kindle 閱讀器（僅會員功能）
- 使用 Google 帳號登入

## 專案架構

## 專案架構（更新後）

本專案仍採用 **六角架構（Hexagonal / Ports & Adapters）**，但在 _Application_ 層進一步導入 **子域 + Facade** 的做法，並新增 **Jobs** 子域以集中背景同步邏輯。整體層次及重要資料夾說明如下：

```
src/
├─ domain/                        # 核心：純商務實體與 Port 介面
│  ├─ entities/
│  └─ ports/
│
├─ application/                   # 應用層：子域 + Facade + Use‑Cases
│  ├─ auth/
│  │   ├─ auth.module.ts
│  │   ├─ auth.facade.ts          # 統一入口，內部呼叫 Use‑Cases
│  │   └─ use-cases/
│  │       ├─ generate-token.use-case.ts
│  │       ├─ get-current-user.use-case.ts
│  │       └─ validate-or-create-user.use-case.ts
│  │
│  ├─ convert/
│  │   ├─ convert.module.ts
│  │   ├─ convert.facade.ts
│  │   └─ use-cases/
│  │       ├─ submit-convert-job.use-case.ts
│  │       ├─ get-convert-job-status.use-case.ts
│  │       ├─ generate-epub.use-case.ts
│  │       └─ download-link.use-case.ts
│  │
│  ├─ kindle-delivery/
│  │   ├─ kindle-delivery.module.ts
│  │   ├─ kindle-delivery.facade.ts
│  │   ├─ kindle-delivery.processor.ts  # Kindle 交付佇列處理器
│  │   └─ use-cases/
│  │       ├─ send-to-kindle.use-case.ts
│  │       └─ get-delivery-history.query.ts
│  │
│  ├─ preview/
│  │   ├─ preview.module.ts
│  │   ├─ preview.facade.ts
│  │   └─ use-cases/
│  │       ├─ add-preview-job.use-case.ts
│  │       ├─ get-preview-job-status.use-case.ts
│  │       └─ preview-novel.use-case.ts
│  │
│  └─ jobs/                       # 跨子域背景同步
│      ├─ jobs.module.ts
│      └─ services/
│          └─ job-status-sync.service.ts
│
├─ infrastructure/                # 具體適配器 (DB / Queue / Mail / Storage …)
│  ├─ crawler/
│  ├─ email/
│  ├─ queue/                      # BullMQ 連線與封裝
│  ├─ storage/
│  └─ repositories/
│
├─ presentation/                  # HTTP 入站介面 (Controllers)
│  ├─ http/                       # REST / GraphQL Controller
│  │   └─ controllers/
│
├─ worker/                        # 背景任務處理進程 (BullMQ Processors)
│  ├─ epub-queue.processor.ts
│  ├─ preview-queue.processor.ts
│  └─ worker.module.ts            # 整合 Worker 相關的模組與 Processor
│
└─ config/                         # TypeORM 等組態
```

### 重要改動摘要

| 區域                            | 說明                                                                                                                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Application → 子域 + Facade** | 每個子域（auth、convert、preview、kindle‑delivery）暴露一支 `*Facade`，Controller / Worker 只依賴 Facade，內部再呼叫多支 Use‑Cases，保持單一職責且易測。                                                          |
| **Jobs 子域**                   | 新增 `job-status-sync.service.ts` 負責定時比對佇列與資料庫狀態，統一背景同步流程。                                                                                                                                |
| **Worker**                      | 大部分的 BullMQ Processor 放在 `src/worker/` 目錄下 (例如 `epub-queue.processor.ts`, `preview-queue.processor.ts`)。這些 Processor 與 HTTP Controller 同樣作為「Ingress Adapter」的角色，處理來自佇列的異步任務。 |
| **Infrastructure**              | 仍維持對外系統整合（PostgreSQL、Supabase、SES、Redis…），但所有實作僅依賴 Domain Port。                                                                                                                           |

> 這樣的結構讓 **核心業務 (Domain + Use‑Cases)** 與 **框架 / 第三方套件** 解耦；同時 Facade 提供簡潔 API 供多種 Adapter 共用，背景同步與長流程也有專屬模組管理。

前端結構：

```
src/
├─ components/             # UI元件
├─ pages/                  # 頁面元件
├─ lib/                    # 通用庫和工具函數
└─ assets/                 # 靜態資源
```

## 技術棧

### 後端

- **框架**: NestJS + TypeScript
- **數據庫**: PostgreSQL + TypeORM
- **佇列系統**: BullMQ + Upstash Redis(可能使用 GCP 自架 Redis)
- **存儲服務**: Supabase Storage
- **電子書生成**: 自定義 EPUB 生成器
- **認證**: Google OAuth
- **部署環境**: GCP(300 美金試用，短期部屬)+Docker

### 前端

- **框架**: React + TypeScript
- **構建工具**: Vite
- **UI 庫**: Tailwind CSS + Shadcn UI
- **狀態管理**: React Context API
- **部署環境**: Vercel

### 開發工具

- **包管理器**: pnpm
- **版本控制**: Git
- **CI/CD**: GitHub Actions
- **代碼質量**: ESLint, Prettier
- **模組系統**: ESM

## 功能狀態

### 已完成功能

- ✅ 小說 URL 預覽功能
- ✅ 遊客轉換 EPUB 功能
- ✅ EPUB 轉換佇列系統
- ✅ EPUB 檔案生成與存儲
- ✅ 使用 Google 帳號登入(Google OAuth)
- ✅ 會員專屬功能：將 EPUB 直接轉寄至 Kindle

### 進行中/未完成功能

- ✅ 用戶任務歷史記錄
- ✅ 每日轉寄配額管理
- 🔄 多語言支援
- 🔄 添加更多小說網站支援
- 🔄 API 限流與安全性強化

## 功能更新

### 使用者功能

- 新增 `kindleEmail` 欄位，用於存儲使用者的 Kindle 電子郵件地址
- 移除 `role` 欄位，不再區分使用者角色
- 新增 API 端點：`GET/PUT /api/user/profile` 用於獲取和更新使用者個人資料

### EPUB 轉換功能

- 新增 `userId` 欄位到 EPUB 任務，記錄誰創建了轉換任務
- 匿名用戶仍可使用轉換功能，此時 `userId` 為 `null`

### Kindle 發送功能

- 新增 Kindle 交付功能，可將 EPUB 檔案發送到指定的 Kindle 電子郵件地址
- 使用 Resend.com 郵件服務發送電子郵件，支援 EPUB 附件
- 每日發送配額限制（每位用戶 3 次/日）
- 支援 `@kindle.com` 和 `@kindle.amazon.com` 格式的 Kindle 郵箱
- 新增 API 端點：
  - `POST /api/kindle/send` 發送 EPUB 到 Kindle
  - `GET /api/kindle/history` 獲取發送歷史記錄

### Send to Kindle 使用流程

1. 會員在「會員中心」頁面設定 Kindle 專屬郵箱（格式必須是 `xxx@kindle.com` 或 `xxx@kindle.amazon.com`）
2. 在轉換完成的 EPUB 任務頁面，點擊「發送到 Kindle」按鈕
3. 系統會將 EPUB 檔案從 Supabase Storage 下載，並通過 Resend 郵件服務發送到指定的 Kindle 郵箱
4. 發送狀態可在「會員中心」的「Kindle 交付歷史」中查看

### Kindle 電子郵件設定注意事項

1. 請確保您在 Amazon 帳戶中已將 `noreply@kindle.syosetu2epub.online` 加入到「已核准的電子郵件清單」中
2. 某些地區的 Kindle 可能需要支付「個人文件傳送費用」，請參考 Amazon 官方說明

## 本地開發設定

### 環境變數設定

1. 後端環境變數 (backend/.env)：

```env
# 資料庫設定
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=syosetu2epub

# Resend 郵件服務設定
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@kindle.syosetu2epub.online

# JWT 認證
JWT_SECRET=your_jwt_secret_key_here

# Google OAuth 設定
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# 前端 URL
FRONTEND_URL=http://localhost:5173
```

2. 前端環境變數 (frontend/.env)：

```
VITE_API_URL=http://localhost:3000
```

### 本地開發與測試

啟動開發環境：

```powershell
# 啟動資料庫
cd backend
pnpm run db:up

# 執行資料庫遷移
pnpm run migrate:run

# 啟動後端服務
pnpm run dev

# 在另一個終端啟動前端
cd frontend
pnpm run dev
```

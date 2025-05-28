# Syosetu2EPUB API 文檔

## 基本資訊

- **基礎 URL**: (替換為後端部署後的實際 URL，例如 `http://localhost:3000` 或 `https://your-api-domain.com`)
- **建議 API 前綴**: `/api` (用於 `/api/auth`, `/api/kindle`) 及 `/novels` (用於小說相關服務)
- **內容類型**: `application/json`
- **授權**: JWT Bearer Token (主要通過 HTTP-Only Cookie `auth_token` 自動傳遞)

## 認證與授權 (Auth)

所有路徑基於 `/api/auth`

### Google OAuth 登入

```
GET /api/auth/google
```

**說明**：將使用者重定向至 Google 登入頁面進行 OAuth 授權。

**認證**：不需要

### Google OAuth 回調

```
GET /api/auth/google/callback
```

**說明**：Google 授權成功後的回調地址。此端點處理如下：

1.  驗證 Google 使用者資料或在系統中創建新使用者。
2.  為該使用者生成 JWT (JSON Web Token)。
3.  將 JWT 設置在名為 `auth_token` 的 HTTP-Only Cookie 中，用於後續的 API 請求認證。
4.  設置一個名為 `is_logged_in` 的常規 Cookie (值為 `true`)，方便前端檢測登入狀態。
5.  將使用者重定向到前端指定的 OAuth 結果頁面（例如，成功時重定向到 `FRONTEND_URL/oauth/success`，失敗時到 `FRONTEND_URL/oauth/error`）。

**認證**：不需要（由 Google OAuth 流程觸發）

**回應**：

- HTTP `302 Found` (重定向)
- **Cookies Set**:
  - `auth_token`: (HttpOnly, Secure in production, SameSite=Lax, Path=/) 包含 JWT。
  - `is_logged_in`: (`true`, Secure in production, SameSite=Lax, Path=/) 前端可讀的登入狀態標識。

### 取得當前登入狀態

```
GET /api/auth/status
```

**說明**：檢查當前使用者是否已通過 `auth_token` Cookie 認證，並返回其基本使用者資訊。

**認證**：需要 (JWT - `auth_token` Cookie)

**回應 (200 OK)**:

```json
{
  "isAuthenticated": true,
  "user": {
    "id": "string", // 使用者唯一 ID
    "email": "string", // 使用者 Email
    "displayName": "string" // 使用者顯示名稱
  }
}
```

**回應 (401 Unauthorized)**: 如果 `auth_token` Cookie 無效、過期或未提供。

### 登出

```
POST /api/auth/logout
```

**說明**：清除伺服器端為使用者設置的 `auth_token` 和 `is_logged_in` Cookies，實現登出。

**認證**：不需要 (但通常由已登入使用者觸發以清除自己的 Cookies)

**回應 (200 OK)**:

```json
{
  "success": true
}
```

## 小說服務 (Novels & EPUB Conversion)

所有路徑基於 `/novels`

### 提交小說預覽請求

```
POST /novels/preview
```

**說明**: 根據提供的小說來源 (source) 和來源 ID (sourceId)，從外部抓取小說基本資訊並存儲到資料庫。此操作通常是同步的，並返回系統中該小說的 ID。

**認證**: 不需要

**請求體 (`application/json`)**:

```json
{
  "source": "string", // 必要。小說來源平台的標識，例如 "syosetu", "kakuyomu"
  "sourceId": "string" // 必要。小說在來源平台上的唯一 ID
}
```

**回應 (200 OK)**:

```json
{
  "success": true,
  "novelId": "string" // 系統中該小說的唯一 ID (新創建或已存在的)
}
```

### 獲取小說預覽任務狀態 (若預覽為異步任務)

```
GET /novels/preview-status/{jobId}
```

**說明**: 如果 `POST /novels/preview` 的設計是提交一個背景預覽任務（而非同步返回 `novelId`），則此端點用於根據 `jobId` 查詢該任務的狀態及最終的預覽結果。 (根據您對 `POST /novels/preview` 回應的確認，此端點的必要性可能需要重新評估，除非預覽流程中有其他異步步驟)

**認證**: 不需要

**路徑參數**:

- `jobId`: 預覽任務的 ID (由提交預覽任務接口返回)。

**回應 (200 OK)**:
(回應結構需參考 `PreviewFacade.getJobStatus` 的實際返回值)

```json
{
  "jobId": "string",
  "status": "queued | processing | completed | failed", // 任務狀態
  "novelId": "string", // 關聯的小說 ID
  "previewData": {
    // 僅在 status 為 'completed' 時出現
    "title": "string",
    "author": "string",
    "description": "string",
    "coverUrl": "string" // 可選
    // ... 其他從 PreviewFacade 返回的預覽欄位
  },
  "error": "string" // 錯誤訊息, 僅在 status 為 'failed' 時出現
}
```

### 根據小說 ID 獲取已存儲的預覽資訊

```
GET /novels/preview/{novelId}
```

**說明**: 直接根據系統中的小說 ID (通常由 `POST /novels/preview` 接口返回) 獲取已存儲的預覽資訊。

**認證**: 不需要

**路徑參數**:

- `novelId`: 小說在系統中的唯一 ID。

**回應 (200 OK)**:
(回應結構需參考 `PreviewFacade.getPreviewById` 的實際返回值)

```json
{
  "novelId": "string",
  "title": "string",
  "author": "string",
  "description": "string",
  "source": "string", // 來源平台
  "sourceId": "string", // 在來源平台的 ID
  "coverUrl": "string", // 封面圖片 URL (可選)
  "novelUpdatedAt": "string" // 小說在源站的更新時間 (可選, ISO 8601 格式)
  // ... 其他從 PreviewFacade 返回的預覽欄位
}
```

### 提交 EPUB 轉換任務

```
POST /novels/convert
```

**說明**: 根據提供的小說 ID (novelId，此 ID 應已通過預覽流程在系統中創建) 提交一個背景任務，將該小說轉換為 EPUB 格式。

**認證**: 可選 (JWT - `auth_token` Cookie)

- 如果使用者已認證，任務將與該使用者 ID 關聯。
- 如果使用者匿名，任務的 `userId` 可能為 `null`。

**請求體 (`application/json`)**:

```json
{
  "novelId": "string" // 必要。需轉換的小說在系統中的唯一 ID。
}
```

**回應 (200 OK / 201 Created)**:
(回應結構需參考 `ConvertFacade.submitJob` 的實際返回值)

```json
{
  "jobId": "string", // EPUB 轉換任務的唯一 ID
  "status": "queued", // 任務初始狀態
  "message": "EPUB 轉換任務已成功提交"
  // ... 其他可能的初始任務資訊，如隊列位置
}
```

### 獲取 EPUB 轉換任務狀態

```
GET /novels/convert/{jobId}/status
```

**說明**: 根據 EPUB 轉換任務的 ID 查詢其處理進度、狀態以及完成後的下載連結。

**認證**: 不需要

**路徑參數**:

- `jobId`: EPUB 轉換任務的 ID。

**回應 (200 OK)**:
(回應結構需參考 `ConvertFacade.getJobStatus` 的實際返回值)

```json
{
  "id": "string", // 等同於 jobId
  "status": "queued | processing | completed | failed", // 任務當前狀態
  "progress": "number", // 轉換進度百分比 (0-100, 可選)
  "createdAt": "string", // 任務創建時間 (ISO 8601 日期時間)
  "updatedAt": "string", // 任務最後更新時間 (ISO 8601 日期時間)
  "completedAt": "string", // 任務完成時間 (ISO 8601 日期時間, 僅在 completed/failed 時出現)
  "downloadUrl": "string", // EPUB 檔案的下載連結 (僅在 status 為 'completed' 時有效, 可選)
  "error": "string", // 錯誤訊息 (僅在 status 為 'failed' 時出現, 可選)
  "novel": {
    // 關聯的小說基本資訊 (可選)
    "id": "string",
    "title": "string",
    "author": "string"
  }
}
```

### 獲取 EPUB 檔案下載連結

```
GET /novels/convert/{jobId}/file
```

**說明**: 獲取指定已完成 EPUB 轉換任務的 EPUB 檔案的下載連結。

**認證**: 不需要

**路徑參數**:

- `jobId`: 已完成的 EPUB 轉換任務的 ID。

**回應 (200 OK)**:
(`Content-Type: application/json`)

```json
{
  "downloadUrl": "string" // 指向 EPUB 檔案的直接下載連結
}
```

## Kindle 轉寄功能

所有路徑基於 `/api/kindle`

### 轉寄 EPUB 至 Kindle

```
POST /api/kindle/send
```

**說明**: 將指定 EPUB 任務生成的檔案發送到使用者提供的 Kindle 電子郵件地址。這會創建一個 Kindle 交付記錄並觸發一個背景發送任務。

**認證**: 需要 (JWT - `auth_token` Cookie)

**請求體 (`application/json`)**:

```json
{
  "jobId": "string", // 必要。已完成的 EPUB 轉換任務 ID，其生成的 EPUB 將被發送。
  "kindleEmail": "string" // 必要。接收 EPUB 的目標 Kindle 電子郵件地址。
}
```

**回應 (200 OK / 201 Created)**:
(回應結構基於 `kindle-delivery.controller.ts` 中的 `sendToKindle` 方法)

```json
{
  "id": "string", // 新創建的 Kindle 交付任務的 ID
  "status": "success", // 操作結果狀態 (可能為 "pending" 或 "queued" 如果發送是異步的)
  "message": "EPUB 檔案已成功寄送至您的 Kindle" // 或 "Kindle 發送任務已提交"
}
```

### 獲取 Kindle 發送歷史記錄

```
GET /api/kindle/history
```

**說明**: 獲取當前認證使用者的 Kindle EPUB 發送歷史記錄，支持分頁。

**認證**: 需要 (JWT - `auth_token` Cookie)

**查詢參數**:

- `page`: `number` (可選, 預設: 1) - 請求的頁碼。
- `limit`: `number` (可選, 預設: 10) - 每頁的項目數量。

**回應 (200 OK)**:

```json
{
  "items": [
    {
      "id": "string", // Kindle 交付記錄的唯一 ID
      "epubJob": {
        // 關聯的 EPUB 任務資訊
        "id": "string", // EPUB 任務 ID
        "novel": {
          // EPUB 任務關聯的小說資訊
          "title": "string", // 小說標題
          "author": "string" // 小說作者
        }
      },
      "toEmail": "string", // 目標 Kindle 電子郵件地址
      "status": "string", // 此次交付的狀態 (例如: "PENDING", "SENT", "FAILED", "PROCESSING" - 需與 KindleDelivery 實體定義一致)
      "errorMessage": "string", // 錯誤訊息 (僅在 status 為 'FAILED' 時出現, 可選)
      "sentAt": "string" // 發送成功或嘗試發送的時間 (ISO 8601 日期時間, 可選)
    }
  ],
  "meta": {
    // 分頁元數據
    "page": "number", // 當前頁碼
    "limit": "number", // 每頁項目數
    "totalItems": "number", // 總項目數
    "totalPages": "number" // 總頁數
  }
}
```

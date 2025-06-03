# Syosetu2EPUB API v1 文檔

本文檔描述 Syosetu2EPUB 應用程式的 API v1 端點，遵循統一的 API 規範和回應格式。

## 📋 基本資訊

- **基礎 URL**: `http://localhost:3000` (開發環境) / `https://your-api-domain.com` (生產環境)
- **API 版本**: v1
- **API 前綴**: `/api/v1/` (除健康檢查端點外)
- **內容類型**: `application/json`
- **授權**: JWT Bearer Token (通過 HTTP-Only Cookie `auth_token` 自動傳遞)

## 🔄 統一回應格式

所有 API 端點都遵循以下統一回應格式：

### 成功回應

```json
{
  "success": true,
  "data": {
    // 實際數據內容
  },
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

### 錯誤回應

```json
{
  "success": false,
  "message": "錯誤描述",
  "error": "ERROR_CODE",
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

## 🏥 健康檢查 API (無前綴)

### 基本健康檢查

- **URL**: `/health`
- **方法**: `GET`
- **描述**: 檢查系統基本健康狀態，包含 API 監控統計
- **需要授權**: 否

**回應範例**:

```json
{
  "status": "healthy",
  "timestamp": "2024-12-21T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "queue": { "status": "healthy" }
  },
  "apiStats": {
    "totalRequests": 1250,
    "totalErrors": 15,
    "errorRate": 1.2,
    "averageResponseTime": 145.5,
    "uptime": 3600
  }
}
```

### 快速健康檢查

- **URL**: `/health/quick`
- **方法**: `GET`
- **描述**: 快速健康檢查，僅返回基本狀態
- **需要授權**: 否

### 系統指標 (需認證)

- **URL**: `/api/v1/health/metrics`
- **方法**: `GET`
- **描述**: 獲取詳細的系統指標和監控數據
- **需要授權**: 是 (JWT)

## 🔐 認證相關 API

### Google OAuth 登入

- **URL**: `/api/v1/auth/google`
- **方法**: `GET`
- **描述**: 開始 Google OAuth 登入流程
- **需要授權**: 否
- **回應**: 重定向到 Google 登入頁面

### Google OAuth 回調

- **URL**: `/api/v1/auth/google/callback`
- **方法**: `GET`
- **描述**: Google OAuth 登入回調
- **回應**: 重定向到前端，設置認證 Cookie

### 獲取當前用戶資訊

- **URL**: `/api/v1/auth/me`
- **方法**: `GET`
- **描述**: 獲取當前已登入用戶的資訊
- **需要授權**: 是 (JWT)

**回應範例**:

```json
{
  "success": true,
  "data": {
    "isAuthenticated": true,
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "displayName": "使用者名稱",
      "kindleEmail": "user@kindle.com"
    }
  },
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

### 用戶登出

- **URL**: `/api/v1/auth/logout`
- **方法**: `POST`
- **描述**: 登出當前用戶
- **需要授權**: 是 (JWT)

## 👤 用戶相關 API

### 獲取用戶資料

- **URL**: `/api/v1/users/profile`
- **方法**: `GET`
- **描述**: 獲取用戶詳細資料
- **需要授權**: 是 (JWT)

### 更新用戶資料

- **URL**: `/api/v1/users/profile`
- **方法**: `PUT`
- **描述**: 更新用戶資料
- **需要授權**: 是 (JWT)

**請求體範例**:

```json
{
  "displayName": "新的顯示名稱",
  "kindleEmail": "new@kindle.com"
}
```

### 獲取任務歷史

- **URL**: `/api/v1/users/job-history`
- **方法**: `GET`
- **描述**: 獲取用戶的任務歷史記錄
- **需要授權**: 是 (JWT)
- **查詢參數**: `page`, `limit`

### 獲取最近任務

- **URL**: `/api/v1/users/recent-jobs`
- **方法**: `GET`
- **描述**: 獲取用戶最近的任務
- **需要授權**: 是 (JWT)
- **查詢參數**: `days` (預設 7 天)

**回應範例**:

```json
{
  "success": true,
  "data": {
    "success": true,
    "jobs": [
      {
        "id": "job_123",
        "title": "小說標題",
        "status": "COMPLETED",
        "createdAt": "2024-12-21T10:00:00.000Z",
        "downloadUrl": "https://storage.example.com/file.epub"
      }
    ]
  },
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

### 獲取發送郵箱

- **URL**: `/api/v1/users/sender-email`
- **方法**: `GET`
- **描述**: 獲取系統發送郵箱地址
- **需要授權**: 是 (JWT)

## 📚 小說相關 API

### 預覽小說

- **URL**: `/api/v1/novels/preview`
- **方法**: `POST`
- **描述**: 提交小說 URL 進行預覽
- **需要授權**: 否

**請求體範例**:

```json
{
  "url": "https://ncode.syosetu.com/n0000aa/",
  "site": "narou"
}
```

**回應範例**:

```json
{
  "success": true,
  "data": {
    "jobId": "preview_123",
    "status": "pending"
  },
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

### 獲取預覽狀態

- **URL**: `/api/v1/novels/preview/:jobId`
- **方法**: `GET`
- **描述**: 獲取預覽任務的狀態和結果
- **需要授權**: 否

**回應範例**:

```json
{
  "success": true,
  "data": {
    "jobId": "preview_123",
    "status": "completed",
    "title": "小說標題",
    "author": "作者名稱",
    "coverUrl": "https://example.com/cover.jpg",
    "chapters": [
      {
        "title": "第一章",
        "url": "https://ncode.syosetu.com/n0000aa/1/"
      }
    ]
  },
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

### 根據 ID 獲取預覽

- **URL**: `/api/v1/novels/:id/preview`
- **方法**: `GET`
- **描述**: 根據小說 ID 獲取預覽資訊
- **需要授權**: 否

## 🔄 轉檔相關 API

### 提交轉檔任務

- **URL**: `/api/v1/conversions`
- **方法**: `POST`
- **描述**: 提交小說 URL 進行 EPUB 轉檔
- **需要授權**: 是 (JWT)

**請求體範例**:

```json
{
  "url": "https://ncode.syosetu.com/n0000aa/",
  "site": "narou",
  "format": "epub"
}
```

**回應範例**:

```json
{
  "success": true,
  "data": {
    "jobId": "convert_123",
    "status": "pending"
  },
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

### 獲取轉檔狀態

- **URL**: `/api/v1/conversions/:jobId`
- **方法**: `GET`
- **描述**: 獲取轉檔任務的狀態
- **需要授權**: 否

**回應範例**:

```json
{
  "success": true,
  "data": {
    "jobId": "convert_123",
    "status": "completed",
    "publicUrl": "https://storage.example.com/file.epub",
    "progress": 100,
    "currentStep": "完成"
  },
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

### 獲取下載連結

- **URL**: `/api/v1/conversions/:jobId/file`
- **方法**: `GET`
- **描述**: 獲取 EPUB 檔案的下載連結
- **需要授權**: 否

## 📱 Kindle 相關 API

### 發送到 Kindle

- **URL**: `/api/v1/kindle/deliveries`
- **方法**: `POST`
- **描述**: 將 EPUB 檔案發送到 Kindle 設備
- **需要授權**: 是 (JWT)

**請求體範例**:

```json
{
  "jobId": "convert_123",
  "kindleEmail": "user@kindle.com"
}
```

**回應範例**:

```json
{
  "success": true,
  "data": {
    "id": "delivery_123",
    "status": "QUEUED",
    "message": "EPUB 已加入 Kindle 發送隊列"
  },
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

### 獲取交付狀態

- **URL**: `/api/v1/kindle/deliveries/:id`
- **方法**: `GET`
- **描述**: 獲取 Kindle 交付狀態
- **需要授權**: 是 (JWT)

### 獲取交付歷史

- **URL**: `/api/v1/kindle/deliveries`
- **方法**: `GET`
- **描述**: 獲取 Kindle 交付歷史記錄
- **需要授權**: 是 (JWT)
- **查詢參數**: `page`, `limit`

## 📊 錯誤代碼

| 錯誤代碼                | HTTP 狀態 | 描述             |
| ----------------------- | --------- | ---------------- |
| `UNAUTHORIZED`          | 401       | 未授權或認證過期 |
| `FORBIDDEN`             | 403       | 權限不足         |
| `NOT_FOUND`             | 404       | 資源不存在       |
| `BAD_REQUEST`           | 400       | 請求參數錯誤     |
| `VALIDATION_ERROR`      | 400       | 資料驗證失敗     |
| `RATE_LIMIT_EXCEEDED`   | 429       | 請求頻率超限     |
| `INTERNAL_SERVER_ERROR` | 500       | 服務器內部錯誤   |

## 🔧 開發注意事項

### 認證機制

- 使用 JWT Token 通過 HTTP-Only Cookie 傳遞
- Cookie 名稱：`auth_token`
- 自動包含在跨域請求中

### 請求頭

```
Content-Type: application/json
Accept: application/json
```

### CORS 設定

- 允許來源：`http://localhost:5173`, `http://localhost:4173`
- 支援認證：`credentials: true`
- 允許方法：`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

### 速率限制

- 預覽 API：每分鐘 10 次請求
- 轉檔 API：每分鐘 5 次請求
- 其他 API：每分鐘 60 次請求

---

**文檔版本**: v1.0.0  
**最後更新**: 2024-12-21  
**維護者**: Syosetu2EPUB 開發團隊

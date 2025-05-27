# Syosetu2EPUB API 文檔

## 基本資訊

- **基礎 URL**: `https://api.syosetu2epub.example.com`
- **API 版本**: v1
- **內容類型**: `application/json`
- **授權**: JWT Bearer Token（Google OAuth 登入後獲取）

## 認證與授權

### Google OAuth 登入

```
GET /api/auth/google
```

說明：重定向至 Google 登入頁面進行授權

### Google OAuth 回調

```
GET /api/auth/google/callback
```

說明：Google 授權成功後的回調地址，回傳 JWT token

回應 (200 OK):

```json
{
  "accessToken": "string",
  "user": {
    "id": "string",
    "email": "string",
    "displayName": "string",
    "role": "free | pro",
    "createdAt": "string"
  }
}
```

### 取得當前登入狀態

```
GET /api/auth/status
```

回應 (200 OK):

```json
{
  "isAuthenticated": "boolean",
  "user": {
    "id": "string",
    "email": "string",
    "displayName": "string",
    "role": "free | pro",
    "createdAt": "string"
  }
}
```

### 登出

```
POST /api/auth/logout
```

回應 (204 No Content)

## 小說預覽

### 獲取小說預覽

```
GET /api/novels/preview?url={novelUrl}
```

認證: 不需要（遊客可用）

參數:

- `novelUrl`: 小說網站的 URL (必須)

回應 (200 OK):

```json
{
  "title": "string",
  "author": "string",
  "coverUrl": "string",
  "synopsis": "string",
  "chapters": [
    {
      "id": "string",
      "title": "string",
      "url": "string"
    }
  ],
  "sourceUrl": "string",
  "sourceSite": "narou | kakuyomu | other"
}
```

## EPUB 任務管理

### 提交轉換任務

```
POST /api/epub-jobs
```

認證: 不需要（遊客可用）

請求體:

```json
{
  "novelUrl": "string",
  "options": {
    "includeChapters": ["string"],
    "excludeChapters": ["string"],
    "customTitle": "string",
    "customAuthor": "string",
    "customCover": "string (base64)",
    "includeToc": "boolean",
    "includeImages": "boolean"
  }
}
```

回應 (202 Accepted):

```json
{
  "id": "string",
  "status": "queued",
  "createdAt": "string",
  "queuePosition": "number"
}
```

### 獲取任務狀態

```
GET /api/epub-jobs/{jobId}
```

認證: 不需要（遊客可用）

參數:

- `jobId`: 任務 ID (路徑參數)

回應 (200 OK):

```json
{
  "id": "string",
  "status": "queued | processing | completed | failed",
  "progress": "number",
  "createdAt": "string",
  "updatedAt": "string",
  "completedAt": "string",
  "downloadUrl": "string",
  "error": "string",
  "novel": {
    "title": "string",
    "author": "string",
    "sourceUrl": "string"
  }
}
```

### 獲取使用者所有任務

```
GET /api/epub-jobs
```

認證: 需要

查詢參數:

- `page`: 頁碼 (預設: 1)
- `limit`: 每頁項目數 (預設: 10)
- `status`: 過濾狀態 (可選: queued, processing, completed, failed)

回應 (200 OK):

```json
{
  "items": [
    {
      "id": "string",
      "status": "queued | processing | completed | failed",
      "progress": "number",
      "createdAt": "string",
      "updatedAt": "string",
      "completedAt": "string",
      "novel": {
        "title": "string",
        "author": "string",
        "sourceUrl": "string"
      }
    }
  ],
  "meta": {
    "page": "number",
    "limit": "number",
    "totalItems": "number",
    "totalPages": "number"
  }
}
```

### 取消任務

```
DELETE /api/epub-jobs/{jobId}
```

認證: 需要

參數:

- `jobId`: 任務 ID (路徑參數)

回應 (204 No Content)

## Kindle 轉寄功能

### 轉寄 EPUB 至 Kindle

```
POST /api/kindle/send
```

認證: 需要（僅會員功能）

請求體:

```json
{
  "jobId": "string",
  "kindleEmail": "string"
}
```

回應 (202 Accepted):

```json
{
  "id": "string",
  "status": "success",
  "message": "EPUB 檔案已成功寄送至您的 Kindle"
}
```

### 獲取轉寄記錄

```
GET /api/kindle/history
```

認證: 需要（僅會員功能）

查詢參數:

- `page`: 頁碼 (預設: 1)
- `limit`: 每頁項目數 (預設: 10)

回應 (200 OK):

```json
{
  "items": [
    {
      "id": "string",
      "epubJob": {
        "id": "string",
        "novel": {
          "title": "string",
          "author": "string"
        }
      },
      "toEmail": "string",
      "status": "success | failed",
      "errorMessage": "string",
      "sentAt": "string"
    }
  ],
  "meta": {
    "page": "number",
    "limit": "number",
    "totalItems": "number",
    "totalPages": "number"
  }
}
```

### 獲取每日轉寄配額

```
GET /api/kindle/quota
```

認證: 需要（僅會員功能）

回應 (200 OK):

```json
{
  "dailyQuota": "number",
  "used": "number",
  "remaining": "number",
  "resetAt": "string"
}
```

## 使用者資料

### 獲取當前使用者資訊

```
GET /api/users/me
```

認證: 需要

回應 (200 OK):

```json
{
  "id": "string",
  "email": "string",
  "displayName": "string",
  "role": "free | pro",
  "createdAt": "string",
  "jobStats": {
    "completed": "number",
    "queued": "number",
    "processing": "number",
    "failed": "number"
  },
  "kindleEmail": "string"
}
```

### 更新使用者資料

```
PATCH /api/users/me
```

認證: 需要

請求體:

```json
{
  "displayName": "string",
  "kindleEmail": "string"
}
```

回應 (200 OK):

```json
{
  "id": "string",
  "email": "string",
  "displayName": "string",
  "kindleEmail": "string",
  "updatedAt": "string"
}
```

## 錯誤處理

所有 API 回應均使用標準 HTTP 狀態碼。錯誤回應格式如下:

```json
{
  "statusCode": "number",
  "message": "string",
  "error": "string",
  "details": "object (optional)"
}
```

常見錯誤狀態碼:

- `400` - 錯誤的請求
- `401` - 未授權
- `403` - 禁止訪問（權限不足，例如非會員嘗試使用 Kindle 轉寄功能）
- `404` - 資源不存在
- `422` - 請求參數驗證失敗
- `429` - 請求頻率過高
- `500` - 伺服器內部錯誤

## 速率限制

API 實施速率限制以防止濫用:

- 認證端點: 20 次請求/分鐘
- 預覽端點: 30 次請求/分鐘
- 任務提交: 10 次請求/分鐘
- Kindle 轉寄: 5 次請求/分鐘（僅會員）
- 其他端點: 60 次請求/分鐘

超過限制將收到 `429 Too Many Requests` 回應，請求頭中的 `Retry-After` 指示等待時間（秒）。

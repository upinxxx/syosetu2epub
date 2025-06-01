# Syosetu2EPUB API 文檔

本文檔描述 Syosetu2EPUB 應用程式的 API 端點，包括 URL、請求方法、請求參數和返回值。

## 基本資訊

- **基礎 URL**: (替換為後端部署後的實際 URL，例如 `http://localhost:3000` 或 `https://your-api-domain.com`)
- **建議 API 前綴**: `/api` (用於 `/api/auth`, `/api/kindle`) 及 `/novels` (用於小說相關服務)
- **內容類型**: `application/json`
- **授權**: JWT Bearer Token (主要通過 HTTP-Only Cookie `auth_token` 自動傳遞)

## 驗證相關 API

### 登入 (Google OAuth)

- **URL**: `/api/auth/google`
- **方法**: `GET`
- **描述**: 開始 Google OAuth 登入流程
- **參數**: 無
- **返回**: 重定向到 Google 登入頁面

### Google OAuth 回調

- **URL**: `/api/auth/google/callback`
- **方法**: `GET`
- **描述**: Google OAuth 登入回調，登入完成後重定向到前端
- **返回**: 重定向到前端頁面，包含 JWT token

### 獲取當前用戶資訊

- **URL**: `/api/auth/me`
- **方法**: `GET`
- **描述**: 獲取當前已登入用戶的資訊
- **需要授權**: 是 (JWT)
- **返回**:

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://example.com/picture.jpg",
    "kindleEmail": "user@kindle.com"
  }
}
```

## 轉換相關 API

### 提交 URL 進行預覽

- **URL**: `/api/preview`
- **方法**: `POST`
- **描述**: 提交小說 URL 進行預覽
- **需要授權**: 否
- **請求體**:

```json
{
  "url": "https://ncode.syosetu.com/example/"
}
```

- **返回**:

```json
{
  "success": true,
  "data": {
    "jobId": "preview_job_id",
    "status": "pending"
  }
}
```

### 獲取預覽狀態

- **URL**: `/api/preview/:jobId`
- **方法**: `GET`
- **描述**: 獲取預覽任務的狀態和結果
- **需要授權**: 否
- **返回**:

```json
{
  "success": true,
  "data": {
    "jobId": "preview_job_id",
    "status": "completed",
    "title": "小說標題",
    "author": "作者",
    "coverUrl": "https://example.com/cover.jpg",
    "chapters": [
      { "title": "章節 1", "url": "https://ncode.syosetu.com/example/1/" },
      { "title": "章節 2", "url": "https://ncode.syosetu.com/example/2/" }
    ]
  }
}
```

### 提交 URL 進行 EPUB 轉換

- **URL**: `/api/convert`
- **方法**: `POST`
- **描述**: 提交小說 URL 進行 EPUB 轉換
- **需要授權**: 否 (但登入用戶可獲得更多功能)
- **請求體**:

```json
{
  "url": "https://ncode.syosetu.com/example/"
}
```

- **返回**:

```json
{
  "success": true,
  "data": {
    "jobId": "convert_job_id",
    "status": "pending"
  }
}
```

### 獲取轉換狀態

- **URL**: `/api/convert/:jobId`
- **方法**: `GET`
- **描述**: 獲取轉換任務的狀態
- **需要授權**: 否
- **返回**:

```json
{
  "success": true,
  "data": {
    "jobId": "convert_job_id",
    "status": "completed",
    "downloadUrl": "https://storage.example.com/epubs/example.epub",
    "title": "小說標題"
  }
}
```

## Kindle 交付相關 API (需要登入)

### 發送 EPUB 到 Kindle

- **URL**: `/api/kindle/send`
- **方法**: `POST`
- **描述**: 將 EPUB 檔案發送到用戶的 Kindle 設備
- **需要授權**: 是 (JWT)
- **請求體**:

```json
{
  "epubJobId": "convert_job_id",
  "kindleEmail": "user@kindle.com"
}
```

- **返回**:

```json
{
  "success": true,
  "message": "EPUB已加入Kindle交付隊列",
  "data": {
    "id": "delivery_id",
    "status": "QUEUED"
  }
}
```

- **錯誤情況**:

```json
{
  "success": false,
  "message": "不是有效的Kindle電子郵件地址 (@kindle.com 或 @kindle.amazon.com)",
  "error": "BAD_REQUEST"
}
```

```json
{
  "success": false,
  "message": "EPUB任務 xxx 尚未完成，當前狀態: PROCESSING",
  "error": "BAD_REQUEST"
}
```

### 獲取 Kindle 交付歷史記錄

- **URL**: `/api/kindle/history`
- **方法**: `GET`
- **描述**: 獲取用戶的 Kindle 交付歷史記錄
- **需要授權**: 是 (JWT)
- **參數**:
  - `page`: 頁碼，預設 1
  - `limit`: 每頁數量，預設 10，最大 50
- **返回**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "delivery_id_1",
        "epubJobId": "convert_job_id_1",
        "epubTitle": "小說標題 1",
        "kindleEmail": "user@kindle.com",
        "status": "SUCCESS",
        "createdAt": "2023-05-01T10:00:00Z",
        "updatedAt": "2023-05-01T10:05:00Z",
        "sentAt": "2023-05-01T10:05:00Z"
      },
      {
        "id": "delivery_id_2",
        "epubJobId": "convert_job_id_2",
        "epubTitle": "小說標題 2",
        "kindleEmail": "user@kindle.com",
        "status": "FAILED",
        "errorMessage": "發送郵件失敗",
        "createdAt": "2023-05-02T11:00:00Z",
        "updatedAt": "2023-05-02T11:05:00Z",
        "sentAt": null
      }
    ],
    "totalItems": 10,
    "totalPages": 1,
    "currentPage": 1,
    "limit": 10
  }
}
```

- **狀態說明**:
  - `QUEUED`: 已加入隊列，等待處理
  - `PROCESSING`: 處理中
  - `SUCCESS`: 發送成功
  - `FAILED`: 發送失敗

### 獲取單個交付記錄詳情

- **URL**: `/api/kindle/:id`
- **方法**: `GET`
- **描述**: 獲取特定 Kindle 交付記錄的詳情
- **需要授權**: 是 (JWT)
- **返回**:

```json
{
  "success": true,
  "data": {
    "id": "delivery_id",
    "epubJobId": "convert_job_id",
    "epubTitle": "小說標題",
    "kindleEmail": "user@kindle.com",
    "status": "sent",
    "createdAt": "2023-05-01T10:00:00Z",
    "updatedAt": "2023-05-01T10:05:00Z"
  }
}
```

## 用戶個人資料 API

### 獲取用戶個人資料

- **URL**: `/api/user/profile`
- **方法**: `GET`
- **描述**: 獲取當前用戶的個人資料
- **需要授權**: 是 (JWT)
- **返回**:

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://example.com/picture.jpg",
    "kindleEmail": "user@kindle.com"
  }
}
```

### 更新用戶個人資料

- **URL**: `/api/user/profile`
- **方法**: `PUT`
- **描述**: 更新當前用戶的個人資料
- **需要授權**: 是 (JWT)
- **請求體**:

```json
{
  "kindleEmail": "new@kindle.com"
}
```

- **返回**:

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://example.com/picture.jpg",
    "kindleEmail": "new@kindle.com"
  }
}
```

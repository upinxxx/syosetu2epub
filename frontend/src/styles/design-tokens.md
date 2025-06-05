# Syosetu2EPUB 設計系統

本文檔記錄了 Syosetu2EPUB 項目的設計標記（Design Tokens）和設計系統的使用指南。

## 色彩系統

### 主色調 - Primary (深藍色系列)

專業穩重的深藍色，用於主要的交互元素和品牌識別。

```css
primary-50: #eff6ff   /* 極淺藍 - 背景色 */
primary-100: #dbeafe  /* 淺藍 - 懸停背景 */
primary-500: #3b82f6  /* 主色 - 按鈕、連結 */
primary-600: #2563eb  /* 深主色 - 按鈕懸停 */
primary-900: #1e3a8a  /* 極深藍 - 文字 */
```

### 輔助色調 - Secondary (紫色系列)

優雅精緻的紫色，用於輔助功能和強調。

```css
secondary-100: #f3e8ff  /* 淺紫 - 背景 */
secondary-500: #a855f7  /* 輔助色 - 特殊按鈕 */
secondary-600: #9333ea  /* 深輔助色 - 懸停 */
```

### 語義色彩

#### 成功色 - Success (綠色系列)

```css
success-50: #f0fdf4   /* 成功背景 */
success-500: #22c55e  /* 成功色 - 完成狀態 */
success-600: #16a34a  /* 深成功色 - 懸停 */
```

#### 警告色 - Warning (橙色系列)

```css
warning-50: #fffbeb   /* 警告背景 */
warning-500: #f59e0b  /* 警告色 - 處理中狀態 */
warning-600: #d97706  /* 深警告色 - 懸停 */
```

#### 錯誤色 - Error (紅色系列)

```css
error-50: #fef2f2     /* 錯誤背景 */
error-500: #ef4444    /* 錯誤色 - 失敗狀態 */
error-600: #dc2626    /* 深錯誤色 - 懸停 */
```

### 中性色調 - Neutral

```css
neutral-50: #fafafa   /* 極淺灰 - 頁面背景 */
neutral-100: #f5f5f5  /* 淺灰 - 卡片背景 */
neutral-300: #d4d4d4  /* 中淺灰 - 邊框 */
neutral-500: #737373  /* 中灰 - 輔助文字 */
neutral-700: #404040  /* 深灰 - 正文 */
neutral-900: #171717  /* 極深灰 - 標題 */
```

## 字體系統

### 字體族

```css
font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", "Microsoft JhengHei", sans-serif
font-mono: "JetBrains Mono", "Fira Code", Consolas, Monaco, monospace
```

### 字體大小階層

```css
text-xs: 0.75rem (12px)     /* 小註釋 */
text-sm: 0.875rem (14px)    /* 輔助文字 */
text-base: 1rem (16px)      /* 正文 */
text-lg: 1.125rem (18px)    /* 副標題 */
text-xl: 1.25rem (20px)     /* 小標題 */
text-2xl: 1.5rem (24px)     /* 標題 */
text-3xl: 1.875rem (30px)   /* 大標題 */
text-4xl: 2.25rem (36px)    /* 頁面標題 */
```

## 間距系統

### 標準間距

```css
1: 0.25rem (4px)    /* 極小間距 */
2: 0.5rem (8px)     /* 小間距 */
3: 0.75rem (12px)   /* 小間距 */
4: 1rem (16px)      /* 標準間距 */
6: 1.5rem (24px)    /* 中等間距 */
8: 2rem (32px)      /* 大間距 */
12: 3rem (48px)     /* 區塊間距 */
16: 4rem (64px)     /* 章節間距 */
```

## 圓角系統

```css
rounded-sm: 0.125rem (2px)   /* 小圓角 - 按鈕 */
rounded: 0.25rem (4px)       /* 標準圓角 - 卡片 */
rounded-md: 0.375rem (6px)   /* 中等圓角 - 輸入框 */
rounded-lg: 0.5rem (8px)     /* 大圓角 - 模態框 */
rounded-xl: 0.75rem (12px)   /* 極大圓角 - 特殊元素 */
rounded-2xl: 1rem (16px)     /* 超大圓角 */
```

## 陰影系統

```css
shadow-xs: 0 1px 2px rgba(0,0,0,0.05)           /* 微陰影 - 按鈕 */
shadow-sm: 0 1px 3px rgba(0,0,0,0.1)            /* 小陰影 - 卡片 */
shadow-md: 0 4px 6px rgba(0,0,0,0.1)            /* 中陰影 - 懸浮元素 */
shadow-lg: 0 10px 15px rgba(0,0,0,0.1)          /* 大陰影 - 模態框 */
shadow-glow: 0 0 20px rgba(59,130,246,0.5)      /* 發光效果 - 聚焦 */
```

## 動畫系統

### 過渡效果

```css
transition-all duration-200   /* 快速過渡 - 按鈕 */
transition-all duration-300   /* 標準過渡 - 卡片 */
transition-all duration-500   /* 慢速過渡 - 頁面切換 */
```

### 緩動函數

```css
ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)       /* 平滑過渡 */
ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)  /* 彈跳效果 */
ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1)   /* 指數緩出 */
```

### 預設動畫

```css
animate-fade-in         /* 淡入 */
animate-slide-in-up     /* 從下滑入 */
animate-scale-in        /* 縮放進入 */
animate-bounce-gentle   /* 輕柔彈跳 */
animate-pulse-gentle    /* 輕柔脈動 */
```

## 使用指南

### 按鈕設計

- 主要操作：`variant="default"` (primary 色系)
- 次要操作：`variant="outline"`
- 下載功能：`variant="download"` (藍色系)
- Kindle 發送：`variant="kindle"` (綠色系)
- 成功狀態：`variant="success"`
- 警告操作：`variant="warning"`
- 危險操作：`variant="destructive"`

### 狀態指示

- 進行中：`warning-500` (橙色)
- 已完成：`success-500` (綠色)
- 失敗：`error-500` (紅色)
- 等待中：`neutral-500` (灰色)

### 卡片設計

- 背景：`bg-white` 或 `bg-neutral-50`
- 邊框：`border border-neutral-200`
- 圓角：`rounded-lg`
- 陰影：`shadow-sm` (靜態) / `shadow-md` (懸停)
- 內距：`p-4` 或 `p-6`

### 間距規則

- 元素內間距：`2-4` (8-16px)
- 相關元素間距：`4-6` (16-24px)
- 區塊間距：`8-12` (32-48px)
- 章節間距：`16-20` (64-80px)

### 響應式設計

- 手機：重點突出，減少視覺干擾
- 平板：適中密度，保持可讀性
- 桌面：充分利用空間，豐富交互

## 無障礙性考量

### 色彩對比

- 文字與背景對比度至少 4.5:1
- 大文字對比度至少 3:1
- 重要交互元素對比度至少 3:1

### 聚焦指示

- 所有交互元素都有清晰的 focus 狀態
- 使用 `focus-visible:ring-2 focus-visible:ring-primary-500`

### 動畫考量

- 提供動畫減少選項 `prefers-reduced-motion`
- 關鍵資訊不依賴於顏色單獨傳達

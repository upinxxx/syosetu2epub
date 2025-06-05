import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心套件
          "react-vendor": ["react", "react-dom", "react-router-dom"],

          "radix-ui": [
            "@radix-ui/react-avatar",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-progress",
            "@radix-ui/react-slot",
          ],

          // 圖標和主題
          "ui-vendor": ["lucide-react", "next-themes", "sonner"],

          // 工具庫
          "utils-vendor": [
            "axios",
            "clsx",
            "class-variance-authority",
            "tailwind-merge",
          ],
        },

        // 優化 chunk 文件名
        chunkFileNames: (chunkInfo) => {
          // 為不同類型的 chunk 設置不同的命名規則
          if (chunkInfo.name?.includes("vendor")) {
            return "vendor/[name]-[hash].js";
          }
          return "chunks/[name]-[hash].js";
        },

        // 優化入口文件名
        entryFileNames: "entry/[name]-[hash].js",

        // 優化資源文件名
        assetFileNames: (assetInfo) => {
          // 根據文件類型分類
          const info = assetInfo.name?.split(".") ?? [];
          const ext = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `styles/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },

    // 設置 chunk 大小警告限制（可選）
    chunkSizeWarningLimit: 400, // KB

    // 啟用 CSS 代碼分割
    cssCodeSplit: true,

    // 優化構建
    minify: "esbuild",
    target: "esnext",

    // 設置 sourcemap（生產環境可以設為 false）
    sourcemap: false,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
    cors: true,
  },
});

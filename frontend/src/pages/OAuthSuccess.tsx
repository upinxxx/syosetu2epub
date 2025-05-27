import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * OAuth 登入成功頁面
 * 簡化版本：僅顯示成功信息，然後自動重定向到首頁
 * 不執行額外的認證檢查或 API 調用，避免循環問題
 */
const OAuthSuccess: React.FC = () => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    console.log("OAuth 成功頁面已載入，準備重定向...");

    // 只設置一個簡單的倒數計時，然後直接跳轉
    const timer = setInterval(() => {
      setCountdown((prev) => {
        // 當倒數到 1 時，執行跳轉
        if (prev <= 1) {
          clearInterval(timer);
          // 使用 window.location.replace 而非 React Router 的 navigate
          // 這確保瀏覽歷史被替換，避免返回按鈕造成循環
          console.log("倒數結束，執行跳轉到首頁");
          window.location.replace("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 清理函數，確保組件卸載時清除計時器
    return () => {
      console.log("OAuth 成功頁面清理，取消計時器");
      clearInterval(timer);
    };
  }, []); // 空依賴數組，確保只執行一次

  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">登入成功！</CardTitle>
          <CardDescription>您已成功使用 Google 帳號登入</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>正在返回首頁，請稍候... {countdown}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthSuccess;

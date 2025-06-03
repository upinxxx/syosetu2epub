import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Loader2, Home, CheckCircle } from "lucide-react";

/**
 * OAuth 登入成功頁面
 * 簡化版本：僅顯示成功信息，然後自動重定向到首頁
 * 不執行額外的認證檢查或 API 調用，避免循環問題
 */
const OAuthSuccess: React.FC = () => {
  const [countdown, setCountdown] = useState(3);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoHome = () => {
    console.log("用戶點擊立即跳轉按鈕");
    setIsRedirecting(true);
    // 清除計時器，避免重複跳轉
    setCountdown(0);
    // 使用 setTimeout 確保狀態更新後再跳轉
    setTimeout(() => {
      window.location.replace("/");
    }, 100);
  };

  useEffect(() => {
    console.log("OAuth 成功頁面已載入，準備重定向...");
    console.log("當前 URL:", window.location.href);
    console.log("Cookie 狀態:", document.cookie);

    // 只設置一個簡單的倒數計時，然後直接跳轉
    const timer = setInterval(() => {
      setCountdown((prev) => {
        console.log("倒數計時:", prev);

        // 當倒數到 1 時，執行跳轉
        if (prev <= 1) {
          clearInterval(timer);
          setIsRedirecting(true);

          // 使用 window.location.replace 而非 React Router 的 navigate
          // 這確保瀏覽歷史被替換，避免返回按鈕造成循環
          console.log("倒數結束，執行跳轉到首頁");
          setTimeout(() => {
            window.location.replace("/");
          }, 500); // 稍微延遲，讓用戶看到狀態改變
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
  }, []);

  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">登入成功！</CardTitle>
          <CardDescription>您已成功使用 Google 帳號登入</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col items-center gap-4">
            {isRedirecting ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>正在跳轉到首頁...</p>
              </>
            ) : (
              <>
                <div className="text-4xl font-bold text-primary">
                  {countdown}
                </div>
                <p>秒後自動返回首頁</p>
              </>
            )}

            {!isRedirecting && (
              <Button
                onClick={handleGoHome}
                className="bg-sky-500 hover:bg-sky-600 text-white font-medium"
                disabled={isRedirecting}
              >
                <Home className="w-4 h-4 mr-2" />
                點此立即跳轉至首頁
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthSuccess;

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
import { useAuth } from "../lib/auth";

/**
 * OAuth 登入成功頁面
 * 登入成功後，刷新認證狀態並自動重定向到首頁
 */
const OAuthSuccess: React.FC = () => {
  const [countdown, setCountdown] = useState(3);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { refreshAuth } = useAuth();

  const handleGoHome = () => {
    setIsRedirecting(true);
    // 清除計時器，避免重複跳轉
    setCountdown(0);
    // 使用 setTimeout 確保狀態更新後再跳轉
    setTimeout(() => {
      window.location.replace("/");
    }, 100);
  };

  useEffect(() => {
    // 先刷新認證狀態，確保登入狀態被正確檢測
    const refreshAndRedirect = async () => {
      try {
        // 強制刷新認證狀態
        await refreshAuth(true);
      } catch (error) {
        console.error("刷新認證狀態失敗:", error);
      }
    };

    // 立即執行認證狀態刷新
    refreshAndRedirect();

    // 設置倒數計時，然後跳轉
    const timer = setInterval(() => {
      setCountdown((prev) => {
        // 當倒數到 1 時，執行跳轉
        if (prev <= 1) {
          clearInterval(timer);
          setIsRedirecting(true);

          // 使用 window.location.replace 而非 React Router 的 navigate
          // 這確保瀏覽歷史被替換，避免返回按鈕造成循環
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
      clearInterval(timer);
    };
  }, [refreshAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <Card className="w-full max-w-md mx-4 text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-700">
            登入成功！
          </CardTitle>
          <CardDescription className="text-gray-600">
            歡迎回到 Syosetu2EPUB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            {isRedirecting ? (
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在跳轉到首頁...</span>
              </div>
            ) : (
              <p className="text-gray-600">
                將在{" "}
                <span className="font-bold text-blue-600">{countdown}</span>{" "}
                秒後自動跳轉到首頁
              </p>
            )}
          </div>

          <Button
            onClick={handleGoHome}
            disabled={isRedirecting}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            variant="default"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                跳轉中...
              </>
            ) : (
              <>
                <Home className="w-4 h-4 mr-2" />
                立即前往首頁
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthSuccess;

import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

/**
 * OAuth 登入錯誤頁面
 * 顯示登入失敗信息並提供重新嘗試的選項
 */
const OAuthError: React.FC = () => {
  const handleGoHome = () => {
    window.location.replace("/");
  };

  const handleRetryLogin = () => {
    // 重新導向到登入頁面
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    window.location.href = `${apiUrl}/api/v1/auth/google`;
  };

  // useEffect(() => {
  //   console.log("OAuth 錯誤頁面已載入");
  //   console.log("當前 URL:", window.location.href);
  //   console.log("錯誤詳情可查看瀏覽器控制台");
  // }, []);

  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-600">登入失敗</CardTitle>
          <CardDescription>很抱歉，Google 登入過程中發生了錯誤</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-red-50 p-4 rounded-lg w-full">
              <p className="text-sm text-red-700">可能的原因：</p>
              <ul className="text-sm text-red-600 mt-2 text-left">
                <li>• 網路連線問題</li>
                <li>• Google 服務暫時不可用</li>
                <li>• 帳號權限設定問題</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                onClick={handleRetryLogin}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重新嘗試
              </Button>

              <Button
                onClick={handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                返回首頁
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthError;

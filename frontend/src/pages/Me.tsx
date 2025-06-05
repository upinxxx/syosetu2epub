import React, { useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import KindleSetupGuideWithEmail from "@/components/KindleSetupGuideWithEmail";

// 動態載入大型元件
const Layout = React.lazy(() => import("@/components/Layout"));
const RecentTasksList = React.lazy(
  () => import("@/components/RecentTasksList")
);
import { useAuth } from "@/lib/contexts";
import {
  CheckCircle,
  XCircle,
  Settings,
  Mail,
  User,
  Calendar,
  Zap,
  Shield,
  Sparkles,
  Edit3,
  ExternalLink,
  ArrowRight,
  Globe,
  Lock,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export default function Me() {
  const { user, isAuthenticated, isLoading, refreshAuth } = useAuth();
  const [isKindleEmailDialogOpen, setIsKindleEmailDialogOpen] = useState(false);

  const handleLogin = () => {
    // 獲取後端 API URL
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

    // 重定向到 Google OAuth 登入頁面
    window.location.href = `${apiUrl}/api/v1/auth/google`;
  };

  const handleSendToKindle = async (jobId: string) => {
    if (!user?.kindleEmail) {
      toast.error("請先設定 Kindle 電子郵件", {
        description: "請先設定您的 Kindle 郵箱",
      });
      return;
    }

    try {
      toast.info("正在發送到 Kindle...", {
        description: "請稍候",
      });

      const response = await apiClient.kindle.send({
        jobId: jobId,
        kindleEmail: user.kindleEmail,
      });

      if (!response.success) {
        throw new Error(response.message || "發送失敗");
      }

      if (response.success || response.data) {
        toast.success("EPUB 已加入 Kindle 發送隊列", {
          description: "請稍後查看您的 Kindle 設備",
        });
      } else {
        throw new Error(response.message || "發送失敗");
      }
    } catch (error: any) {
      console.error("發送到 Kindle 失敗:", error);
      const errorMessage = error.message || "發送到 Kindle 時發生錯誤";
      toast.error(errorMessage, {
        description: "發送失敗",
      });
    }
  };

  // 載入中狀態
  if (isLoading) {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        }
      >
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </Layout>
      </Suspense>
    );
  }

  // 未登入時顯示登入頁面
  if (!isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        }
      >
        <Layout>
          {/* 登入頁面 Hero Section */}
          <section className="relative min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 overflow-hidden flex items-center">
            {/* 背景裝飾 */}
            <div className="absolute inset-0">
              <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 left-10 w-48 h-48 bg-purple-300/20 rounded-full blur-2xl"></div>
              <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-yellow-300/20 rounded-full blur-xl"></div>
              <div className="absolute top-20 left-20 w-20 h-20 bg-pink-300/30 rounded-full blur-xl"></div>
              <div className="absolute bottom-20 right-20 w-40 h-40 bg-green-300/20 rounded-full blur-2xl"></div>
            </div>

            <div className="container mx-auto px-4 py-12 relative z-10">
              <div className="max-w-4xl mx-auto">
                {/* 主要登入卡片 */}
                <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg mx-auto mb-6">
                      <User className="w-10 h-10 text-white" />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                      歡迎使用
                      <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent ml-3">
                        Syosetu2EPUB
                      </span>
                    </h1>

                    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                      登入您的帳戶，開始享受完整的小說轉換和 Kindle 發送服務
                    </p>

                    {/* 登入按鈕 */}
                    <div className="mb-8">
                      <Button
                        onClick={handleLogin}
                        className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-12 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg font-semibold"
                      >
                        <Globe className="mr-3 h-6 w-6" />
                        使用 Google 登入
                        <ArrowRight className="ml-3 h-6 w-6" />
                      </Button>
                    </div>

                    {/* 安全提示 */}
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
                      <Lock className="w-4 h-4" />
                      <span>安全、快速的 Google OAuth 登入</span>
                    </div>
                  </div>

                  {/* 功能特色展示 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-6 bg-sky-50 rounded-2xl border border-sky-100">
                      <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-800 mb-2">快速轉換</h3>
                      <p className="text-sm text-gray-600">
                        一鍵將小說轉換為 EPUB 格式
                      </p>
                    </div>

                    <div className="text-center p-6 bg-purple-50 rounded-2xl border border-purple-100">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-800 mb-2">
                        Kindle 發送
                      </h3>
                      <p className="text-sm text-gray-600">
                        直接發送到您的 Kindle 設備
                      </p>
                    </div>

                    <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-100">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-800 mb-2">安全可靠</h3>
                      <p className="text-sm text-gray-600">
                        Google 認證，保護您的隱私
                      </p>
                    </div>
                  </div>

                  {/* 底部連結 */}
                  <div className="text-center border-t border-gray-200 pt-6">
                    <p className="text-gray-600 mb-4">還不熟悉使用方法？</p>
                    <Button
                      asChild
                      variant="outline"
                      className="border-2 border-sky-500 text-sky-600 hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 px-6 py-2 rounded-xl transition-all duration-200 hover:border-sky-600"
                    >
                      <Link to="/how-to-use">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        查看使用教學
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Layout>
      </Suspense>
    );
  }

  // 已登入用戶顯示原本的會員頁面
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      }
    >
      <Layout>
        {/* Hero Section with User Info */}
        <section className="relative bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 overflow-hidden">
          {/* 背景裝飾 */}
          <div className="absolute inset-0">
            <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 left-10 w-48 h-48 bg-purple-300/20 rounded-full blur-2xl"></div>
            <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-yellow-300/20 rounded-full blur-xl"></div>
          </div>

          <div className="container mx-auto px-4 py-12 relative z-10">
            <div className="max-w-4xl mx-auto">
              {/* 用戶歡迎區塊 */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* 用戶頭像區塊 */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <User className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  {/* 用戶資訊 */}
                  <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                      歡迎回來，
                      <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                        {user?.displayName || "會員"}
                      </span>
                      ！
                    </h1>
                    <p className="text-gray-600 mb-4">
                      管理您的帳戶設定和轉換記錄
                    </p>

                    {/* 狀態指示器 */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        已驗證會員
                      </div>
                      {user?.kindleEmail && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          <Mail className="w-4 h-4" />
                          Kindle 已設定
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        <Sparkles className="w-4 h-4" />
                        完整功能
                      </div>
                    </div>
                  </div>

                  {/* 快捷操作 */}
                  <div className="flex-shrink-0">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/50 text-gray-700 hover:bg-white/50 backdrop-blur-sm"
                        onClick={() => setIsKindleEmailDialogOpen(true)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        設定
                      </Button>
                      <Button
                        asChild
                        variant="default"
                        size="sm"
                        className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg"
                      >
                        <Link to="/how-to-use">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          使用教學
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 主要內容區 */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 左側：設定和狀態 */}
              <div className="lg:col-span-1 space-y-6">
                {/* Kindle 設定卡片 */}
                <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Mail className="w-5 h-5 text-blue-600" />
                      Kindle 設定
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {user?.kindleEmail ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div className="flex-1">
                              <p className="font-medium text-green-800">
                                設定完成
                              </p>
                              <p className="text-sm text-green-600 break-all">
                                {user.kindleEmail}
                              </p>
                            </div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-700">
                              🚀 您現在可以直接將 EPUB 檔案發送到 Kindle 裝置
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <XCircle className="w-5 h-5 text-orange-600" />
                            <div className="flex-1">
                              <p className="font-medium text-orange-800">
                                尚未設定
                              </p>
                              <p className="text-sm text-orange-600">
                                設定後可自動轉寄 EPUB
                              </p>
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600">
                              💡 設定 Kindle 收件信箱以啟用自動轉寄功能
                            </p>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => setIsKindleEmailDialogOpen(true)}
                        className={`w-full ${
                          user?.kindleEmail
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-green-600 hover:bg-green-700"
                        } text-white shadow-lg hover:shadow-xl transition-all duration-200`}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        {user?.kindleEmail ? "修改設定" : "立即設定"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 帳戶資訊卡片 */}
                <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="w-5 h-5 text-purple-600" />
                      帳戶資訊
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            顯示名稱
                          </span>
                        </div>
                        <span className="font-medium text-gray-800">
                          {user?.displayName || "未設定"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            加入時間
                          </span>
                        </div>
                        <span className="font-medium text-gray-800">
                          {new Date().toLocaleDateString("zh-TW")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-purple-700">
                            服務狀態
                          </span>
                        </div>
                        <span className="font-medium text-purple-800">
                          正式會員
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 右側：最近任務 */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      最近的任務
                    </h2>
                    <p className="text-gray-600">查看您的轉換記錄</p>
                  </div>
                  <div className="p-6">
                    <RecentTasksList
                      onSendToKindle={handleSendToKindle}
                      showCard={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kindle 電子郵件設定對話框 */}
        <Dialog
          open={isKindleEmailDialogOpen}
          onOpenChange={setIsKindleEmailDialogOpen}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <span>設定 Kindle 電子郵件</span>
              </DialogTitle>
            </DialogHeader>
            <KindleSetupGuideWithEmail
              initialEmail={user?.kindleEmail}
              onComplete={async () => {
                // 關閉對話框前先確保用戶狀態是最新的
                await refreshAuth(true);
                setIsKindleEmailDialogOpen(false);
              }}
              onCancel={() => {
                setIsKindleEmailDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </Layout>
    </Suspense>
  );
}

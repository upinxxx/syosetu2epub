import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import KindleEmailForm from "@/components/KindleEmailForm";
import { useAuth } from "@/lib/contexts";
import { CheckCircle, XCircle, Settings, Mail } from "lucide-react";

// 用戶資料介面
interface UserStats {
  totalJobs: number;
  completedJobs: number;
  dailyQuota: number;
  usedQuota: number;
  membershipType: "free" | "premium";
  membershipExpiry?: string;
}

export default function Me() {
  const { user } = useAuth();
  const [isKindleEmailDialogOpen, setIsKindleEmailDialogOpen] = useState(false);

  // TODO: 實作 API 呼叫獲取用戶資料
  const userStats: UserStats = {
    totalJobs: 25,
    completedJobs: 20,
    dailyQuota: 10,
    usedQuota: 3,
    membershipType: "free",
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8 text-gray-800">會員中心</h1>

        {/* 用戶狀態概覽 */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">今日配額</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress
                value={(userStats.usedQuota / userStats.dailyQuota) * 100}
                className="mb-2 bg-gray-200"
              />
              <p className="text-sm text-gray-600">
                已使用 {userStats.usedQuota} / {userStats.dailyQuota} 次
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 最近任務列表 */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">最近任務</h2>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
              asChild
            >
              <Link to="/jobs/1">查看全部</Link>
            </Button>
          </div>
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-0">
              <div className="divide-y border-gray-200">
                {/* TODO: 實作 API 呼叫獲取最近任務列表 */}
                {[1, 2, 3].map((_, index) => (
                  <div
                    key={index}
                    className="p-4 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-medium text-gray-800">
                        範例小說標題 {index + 1}
                      </h3>
                      <p className="text-sm text-gray-500">處理中...</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      asChild
                    >
                      <Link to={`/jobs/${index + 1}`}>查看詳情</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 會員設定 */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">會員設定</h2>
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              {/* Kindle 電子郵件設定 */}
              <div className="flex items-start justify-between p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        Kindle 電子郵件
                      </h3>
                      {user?.kindleEmail ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    {user?.kindleEmail ? (
                      <div className="space-y-1">
                        <p className="text-sm text-green-700 font-medium">
                          ✅ 已設定完成
                        </p>
                        <p className="text-sm text-gray-600 break-all">
                          {user.kindleEmail}
                        </p>
                        <p className="text-xs text-gray-500">
                          您可以直接發送 EPUB 檔案到 Kindle 裝置
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 font-medium">
                          ❌ 尚未設定
                        </p>
                        <p className="text-sm text-gray-500">
                          設定 Kindle 收件信箱以啟用自動轉寄功能
                        </p>
                        <p className="text-xs text-gray-400">
                          設定後可直接將轉檔完成的 EPUB 發送到您的 Kindle
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      user?.kindleEmail
                        ? "border-blue-600 text-blue-600 hover:bg-blue-50"
                        : "border-green-600 text-green-600 hover:bg-green-50"
                    }
                    onClick={() => setIsKindleEmailDialogOpen(true)}
                  >
                    <Settings className="mr-1 h-3 w-3" />
                    {user?.kindleEmail ? "修改" : "設定"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Kindle 電子郵件設定對話框 */}
      <Dialog
        open={isKindleEmailDialogOpen}
        onOpenChange={setIsKindleEmailDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <span>設定 Kindle 電子郵件</span>
            </DialogTitle>
          </DialogHeader>
          <KindleEmailForm
            initialEmail={user?.kindleEmail}
            onSuccess={() => setIsKindleEmailDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

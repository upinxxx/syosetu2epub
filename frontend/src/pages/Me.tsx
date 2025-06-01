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
import { useAuth } from "@/lib/auth";

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">會員等級</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold">
                  {userStats.membershipType === "premium"
                    ? "付費會員"
                    : "免費會員"}
                </span>
                {userStats.membershipType === "free" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    升級會員
                  </Button>
                )}
              </div>
              {userStats.membershipExpiry && (
                <p className="text-sm text-gray-500 mt-2">
                  到期日：{userStats.membershipExpiry}
                </p>
              )}
            </CardContent>
          </Card>

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

          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">轉換統計</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">總任務數：{userStats.totalJobs}</p>
                <p className="text-sm">完成任務：{userStats.completedJobs}</p>
                <p className="text-sm text-gray-500">
                  完成率：
                  {Math.round(
                    (userStats.completedJobs / userStats.totalJobs) * 100
                  )}
                  %
                </p>
              </div>
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
            <CardContent className="space-y-4 p-6">
              <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md transition-colors">
                <div>
                  <h3 className="font-medium text-gray-800">Kindle 電子郵件</h3>
                  <p className="text-sm text-gray-500">
                    {user?.kindleEmail
                      ? `目前設定：${user.kindleEmail}`
                      : "設定 Kindle 收件信箱以啟用自動轉寄功能"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  onClick={() => setIsKindleEmailDialogOpen(true)}
                >
                  {user?.kindleEmail ? "修改" : "設定"}
                </Button>
              </div>

              <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md transition-colors">
                <div>
                  <h3 className="font-medium text-gray-800">通知設定</h3>
                  <p className="text-sm text-gray-500">管理電子郵件通知偏好</p>
                </div>
                <Button
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  管理
                </Button>
              </div>

              <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md transition-colors">
                <div>
                  <h3 className="font-medium text-gray-800">帳號安全</h3>
                  <p className="text-sm text-gray-500">更改密碼與安全設定</p>
                </div>
                <Button
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  設定
                </Button>
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
            <DialogTitle>設定 Kindle 電子郵件</DialogTitle>
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

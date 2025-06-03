import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import KindleEmailForm from "@/components/KindleEmailForm";
import RecentTasksList from "@/components/RecentTasksList";
import { useAuth } from "@/lib/contexts";
import { CheckCircle, XCircle, Settings, Mail } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export default function Me() {
  const { user } = useAuth();
  const [isKindleEmailDialogOpen, setIsKindleEmailDialogOpen] = useState(false);

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8 text-gray-800">會員中心</h1>

        {/* 最近任務列表 */}
        <section className="mb-8">
          <RecentTasksList onSendToKindle={handleSendToKindle} />
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
        <DialogContent className="sm:max-w-[600px]">
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

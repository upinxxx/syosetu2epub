import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, CheckCircle, Clock, Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts";
import { apiClient } from "@/lib/api-client";
import type { UpdateProfileDto } from "@/lib/api-client";

interface KindleSetupGuideWithEmailProps {
  onComplete: () => void;
  onCancel: () => void;
  initialEmail?: string;
}

// Kindle 郵箱驗證函數
const validateKindleEmail = (email: string): string | null => {
  if (!email.trim()) {
    return "請輸入Kindle電子郵件地址";
  }

  const kindleEmailRegex = /^[^\s@]+@kindle(\.amazon)?\.com$/;
  if (!kindleEmailRegex.test(email)) {
    return "必須是有效的Kindle郵箱 (@kindle.com 或 @kindle.amazon.com)";
  }

  return null;
};

export default function KindleSetupGuideWithEmail({
  onComplete,
  onCancel,
  initialEmail = "",
}: KindleSetupGuideWithEmailProps) {
  const { user, refreshAuth } = useAuth();

  // 狀態管理
  const [senderEmail, setSenderEmail] = useState<string>("");
  const [kindleEmail, setKindleEmail] = useState(
    initialEmail || user?.kindleEmail || ""
  );
  const [countdown, setCountdown] = useState<number>(30);
  const [isCountdownActive, setIsCountdownActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSaved, setEmailSaved] = useState<boolean>(false);

  // 獲取寄件人郵箱
  useEffect(() => {
    const fetchSenderEmail = async () => {
      try {
        const response = await apiClient.users.getSenderEmail();
        setSenderEmail(
          response.data?.senderEmail || "noreply@kindle.syosetu2epub.online"
        );
      } catch (error) {
        console.error("獲取寄件人郵箱失敗:", error);
        setSenderEmail("noreply@kindle.syosetu2epub.online");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSenderEmail();
  }, []);

  // 倒數計時器
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCountdownActive && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isCountdownActive && countdown === 0) {
      setIsCountdownActive(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isCountdownActive, countdown]);

  // 處理郵箱保存
  const handleEmailSave = async () => {
    // 驗證輸入
    const validationError = validateKindleEmail(kindleEmail);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    try {
      setIsSubmitting(true);

      // 呼叫API更新用戶的Kindle郵箱
      const requestData: UpdateProfileDto = {
        kindleEmail: kindleEmail,
      };

      const response = await apiClient.users.updateProfile(requestData);

      if (response.success) {
        // 顯示成功提示
        toast.success("您的Kindle郵箱已更新", {
          description: "請完成Amazon認可寄件者設定",
        });

        // 設定郵箱已保存，開始倒數
        setEmailSaved(true);
        setIsCountdownActive(true);

        // 在背景更新用戶狀態
        refreshAuth(true).catch(console.error);
      } else {
        // 即使API響應不成功，也繼續流程（確保一致性）
        toast.warning("設定可能未完全成功，請完成Amazon認可寄件者設定", {
          description: "請按照指南完成設定",
        });
        setEmailSaved(true);
        setIsCountdownActive(true);
      }
    } catch (error: any) {
      console.error("更新Kindle郵箱失敗:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "更新Kindle郵箱時發生錯誤";

      // 統一邏輯：即使發生錯誤，也繼續流程（確保用戶體驗一致性）
      toast.warning("郵箱設定遇到問題，但仍需完成Amazon認可寄件者設定", {
        description: "請按照指南完成設定",
      });
      setEmailSaved(true);
      setIsCountdownActive(true);

      // 同時顯示錯誤信息供用戶參考
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 處理完成設定
  const handleConfirmSetup = async () => {
    if (countdown === 0) {
      toast.success("Amazon Kindle 設定完成！", {
        description: "您現在可以直接將 EPUB 發送到 Kindle 了",
      });

      // 再次確保用戶狀態是最新的
      await refreshAuth(true);

      onComplete();
    }
  };

  // 處理輸入變化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKindleEmail(value);

    // 清除錯誤信息（當用戶開始輸入時）
    if (error && value.trim()) {
      setError(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">載入中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <span>Amazon Kindle 設定指南</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            為了讓我們能夠將 EPUB 檔案直接發送到您的 Kindle，您需要在 Amazon
            帳戶中將我們的寄件人郵箱加入認可的寄件者清單。
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* 步驟 1 */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">
              步驟 1：前往 Amazon 管理您的內容和裝置
            </h3>
            <p className="text-blue-800 text-sm mb-3">
              點擊下方按鈕前往 Amazon 官方設定頁面
            </p>
            <Button
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
              onClick={() =>
                window.open(
                  "https://www.amazon.com/mn/dcw/myx.html#/home/settings/payment",
                  "_blank"
                )
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              前往 Amazon 設定頁面
            </Button>
          </div>

          {/* 步驟 2 */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">
              步驟 2：添加認可的寄件者
            </h3>
            <p className="text-green-800 text-sm mb-3">
              在「個人文件設定」中，將以下郵箱地址添加到「認可的個人文件電子郵件清單」：
            </p>
            <div className="bg-white p-3 rounded border border-green-300">
              <code className="text-green-700 font-mono text-sm break-all">
                {senderEmail}
              </code>
            </div>
          </div>

          {/* 步驟 3 */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-900 mb-2">
              步驟 3：輸入信箱並確認設定完成
            </h3>

            {/* 郵箱輸入區域 */}
            {!emailSaved ? (
              <div className="space-y-3 mb-4">
                <Label htmlFor="kindleEmail" className="text-orange-800">
                  Kindle 電子郵件
                </Label>
                <Input
                  id="kindleEmail"
                  type="email"
                  placeholder="your-kindle@kindle.com"
                  value={kindleEmail}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="bg-white"
                />
                {error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-orange-700">
                  請輸入您的Kindle專屬郵箱，格式為 xxx@kindle.com 或
                  xxx@kindle.amazon.com
                </p>
                <Button
                  onClick={handleEmailSave}
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isSubmitting ? "儲存中..." : "儲存郵箱設定"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border border-orange-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      郵箱已設定：
                    </span>
                    <code className="text-orange-700 font-mono text-sm break-all">
                      {kindleEmail}
                    </code>
                  </div>
                </div>

                <p className="text-orange-800 text-sm mb-3">
                  完成 Amazon 設定後，等待倒數結束即可確認設定
                </p>

                {countdown > 0 && (
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="text-orange-800">
                      請等待 {countdown} 秒後確認...
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleConfirmSetup}
                  disabled={countdown > 0}
                  className={
                    countdown > 0
                      ? "bg-gray-400 hover:bg-gray-400 text-gray-600 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  我已完成設定
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <div className="text-sm text-gray-500">
            設定完成後，您就可以直接將 EPUB 發送到 Kindle 了
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

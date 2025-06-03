import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, CheckCircle, Clock } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface AmazonKindleSetupGuideProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function AmazonKindleSetupGuide({
  onComplete,
  onCancel,
}: AmazonKindleSetupGuideProps) {
  const [senderEmail, setSenderEmail] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(30);
  const [isCountdownActive, setIsCountdownActive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  const handleConfirmSetup = () => {
    if (countdown === 0) {
      onComplete();
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

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-900 mb-2">
              步驟 3：確認設定完成
            </h3>
            <p className="text-orange-800 text-sm mb-3">
              完成設定後，等待倒數結束即可確認設定
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
        </div>

        <div className="flex justify-between pt-4">
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

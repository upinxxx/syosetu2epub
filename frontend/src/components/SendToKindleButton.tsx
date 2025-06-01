import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import KindleEmailForm from "./KindleEmailForm";

interface SendToKindleButtonProps {
  epubJobId: string;
  disabled?: boolean;
}

// 交付狀態類型
type DeliveryStatus = "pending" | "processing" | "completed" | "failed";

// 交付狀態響應接口
interface DeliveryStatusResponse {
  success: boolean;
  data: {
    id: string;
    status: DeliveryStatus;
    errorMessage?: string;
    sentAt?: string;
  };
}

export default function SendToKindleButton({
  epubJobId,
  disabled = false,
}: SendToKindleButtonProps) {
  const { user, isAuthenticated, refreshAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"form" | "confirm" | "status">(
    "form"
  );
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollTimer, setPollTimer] = useState<number | null>(null);

  // 檢查用戶是否已登入且有Kindle郵箱
  const hasKindleEmail = isAuthenticated && user?.kindleEmail;

  // 處理發送到Kindle
  const handleSendToKindle = async () => {
    if (!isAuthenticated) {
      // 未登入，顯示提示
      toast({
        title: "需要登入",
        description: "請先登入以使用Send to Kindle功能",
        variant: "destructive",
      });
      return;
    }

    if (!hasKindleEmail) {
      // 無Kindle郵箱，顯示設定表單
      setDialogMode("form");
      setIsDialogOpen(true);
      return;
    }

    // 有Kindle郵箱，顯示確認對話框
    setDialogMode("confirm");
    setIsDialogOpen(true);
  };

  // 確認發送到Kindle
  const confirmSendToKindle = async () => {
    try {
      setIsLoading(true);

      // 呼叫API發送EPUB到Kindle
      const response = await fetch("/api/kindle/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          epubJobId,
          kindleEmail: user?.kindleEmail,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "發送失敗");
      }

      const data = await response.json();

      // 保存交付ID，用於後續狀態查詢
      setDeliveryId(data.data.id);
      setDeliveryStatus(data.data.status);

      // 切換到狀態追蹤模式
      setDialogMode("status");

      // 開始輪詢狀態
      startStatusPolling(data.data.id);

      // 顯示成功提示
      toast({
        title: "發送成功",
        description: "EPUB已加入發送隊列，請稍後查看您的Kindle",
      });
    } catch (error) {
      console.error("發送到Kindle失敗:", error);
      toast({
        title: "發送失敗",
        description:
          error instanceof Error ? error.message : "發送EPUB到Kindle時發生錯誤",
        variant: "destructive",
      });
      // 關閉對話框
      setIsDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 開始輪詢交付狀態
  const startStatusPolling = (id: string) => {
    // 先清除可能存在的計時器
    if (pollTimer !== null) {
      clearInterval(pollTimer);
    }

    // 立即查詢一次狀態
    fetchDeliveryStatus(id);

    // 設置輪詢計時器，每5秒查詢一次
    const timerId = window.setInterval(() => {
      fetchDeliveryStatus(id);
    }, 5000);

    setPollTimer(timerId as unknown as number);
  };

  // 查詢交付狀態
  const fetchDeliveryStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/kindle/delivery-status/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("獲取交付狀態失敗");
      }

      const data = (await response.json()) as DeliveryStatusResponse;

      setDeliveryStatus(data.data.status);
      setErrorMessage(data.data.errorMessage || null);

      // 如果狀態為已完成或失敗，停止輪詢
      if (data.data.status === "completed" || data.data.status === "failed") {
        stopStatusPolling();
      }
    } catch (error) {
      console.error("獲取交付狀態失敗:", error);
    }
  };

  // 停止輪詢
  const stopStatusPolling = () => {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      setPollTimer(null);
    }
  };

  // 組件卸載時清除計時器
  useEffect(() => {
    return () => {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
      }
    };
  }, [pollTimer]);

  // 設定Kindle郵箱後的回調
  const handleEmailSetupSuccess = async () => {
    // 先刷新Auth狀態以獲取最新的kindleEmail
    await refreshAuth();
    // 然後切換到確認模式
    setDialogMode("confirm");
  };

  // 獲取狀態文本
  const getStatusText = (status: DeliveryStatus | null) => {
    switch (status) {
      case "pending":
        return "等待處理中...";
      case "processing":
        return "正在發送到您的Kindle...";
      case "completed":
        return "已成功發送到您的Kindle！";
      case "failed":
        return "發送失敗";
      default:
        return "準備發送...";
    }
  };

  return (
    <>
      <Button
        onClick={handleSendToKindle}
        disabled={disabled || isLoading}
        variant="outline"
        className="border-blue-600 text-blue-600 hover:bg-blue-50"
      >
        {isLoading ? "處理中..." : "發送到Kindle"}
      </Button>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          // 關閉對話框時停止輪詢
          if (!open) {
            stopStatusPolling();
          }
          setIsDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          {dialogMode === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle>設定Kindle電子郵件</DialogTitle>
                <DialogDescription>
                  請設定您的Kindle專屬郵箱以啟用Send to Kindle功能
                </DialogDescription>
              </DialogHeader>
              <KindleEmailForm
                initialEmail={user?.kindleEmail}
                onSuccess={handleEmailSetupSuccess}
              />
            </>
          ) : dialogMode === "confirm" ? (
            <>
              <DialogHeader>
                <DialogTitle>確認發送到Kindle</DialogTitle>
                <DialogDescription>
                  EPUB將發送到您的Kindle郵箱：{user?.kindleEmail}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  取消
                </Button>
                <Button onClick={confirmSendToKindle} disabled={isLoading}>
                  {isLoading ? "發送中..." : "確認發送"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Kindle交付狀態</DialogTitle>
                <DialogDescription>
                  {getStatusText(deliveryStatus)}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {deliveryStatus === "processing" ||
                deliveryStatus === "pending" ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : deliveryStatus === "completed" ? (
                  <div className="text-center text-green-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="mt-2">已成功發送到您的Kindle</p>
                  </div>
                ) : (
                  <div className="text-center text-red-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <p className="mt-2">發送失敗</p>
                    {errorMessage && (
                      <p className="mt-1 text-sm">{errorMessage}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  關閉
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

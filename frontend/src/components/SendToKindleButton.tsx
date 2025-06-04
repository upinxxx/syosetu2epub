import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/contexts";
import { useCooldown } from "@/lib/hooks/useCooldown";
import KindleEmailForm from "./KindleEmailForm";
import { Clock, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

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
  const [pollRetryCount, setPollRetryCount] = useState(0);
  const MAX_POLL_RETRIES = 3;

  // 使用冷卻 Hook
  const {
    isInCooldown,
    remainingSeconds,
    startCooldown,
    handleServerCooldownError,
  } = useCooldown(epubJobId);

  // 檢查用戶是否已登入且有Kindle郵箱
  const hasKindleEmail = isAuthenticated && user?.kindleEmail;

  // 按鈕是否應該被禁用
  const isButtonDisabled = disabled || isLoading || isInCooldown;

  // 處理發送到Kindle
  const handleSendToKindle = async () => {
    if (!isAuthenticated) {
      // 未登入，顯示提示
      toast.error("請先登入以使用Send to Kindle功能", {
        description: "需要登入才能發送檔案到您的Kindle",
        duration: 5000,
        style: {
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "white",
          border: "none",
          boxShadow: "0 10px 25px rgba(245, 158, 11, 0.3)",
        },
        icon: "🔐",
      });
      return;
    }

    if (isInCooldown) {
      toast.warning(`請等待 ${remainingSeconds} 秒後再重新發送`, {
        description: "為避免濫用，發送功能有冷卻時間限制",
        duration: 3000,
        style: {
          background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          color: "white",
          border: "none",
          boxShadow: "0 10px 25px rgba(139, 92, 246, 0.3)",
        },
        icon: "⏰",
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
      const response = await apiClient.kindle.send({
        jobId: epubJobId,
        kindleEmail: user?.kindleEmail || "",
      });

      if (!response.success) {
        // 檢查是否為冷卻錯誤
        if (response.message?.includes("請等待")) {
          handleServerCooldownError(response.message);
          toast.error(response.message, {
            description: "請稍候再試",
            duration: 5000,
            style: {
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              color: "white",
              border: "none",
              boxShadow: "0 10px 25px rgba(139, 92, 246, 0.3)",
            },
            icon: "⏰",
          });
          setIsDialogOpen(false);
          return;
        }

        throw new Error(response.message || "發送失敗");
      }

      // 發送成功，開始冷卻
      startCooldown();

      // 保存交付ID，用於後續狀態查詢
      const deliveryId = response.data?.data?.id;
      if (deliveryId) {
        setDeliveryId(deliveryId);
        setDeliveryStatus("pending");

        // 切換到狀態追蹤模式
        setDialogMode("status");

        // 開始輪詢狀態
        startStatusPolling(deliveryId);
      }

      // 顯示成功提示
      toast.success("EPUB已加入發送隊列，請稍後查看您的Kindle", {
        description: "發送成功！檢查您的Kindle設備或應用程式",
        duration: 6000,
        style: {
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "white",
          border: "none",
          boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
        },
        icon: "📚",
      });
    } catch (error) {
      console.error("發送到Kindle失敗:", error);
      toast.error(
        error instanceof Error ? error.message : "發送EPUB到Kindle時發生錯誤",
        {
          description: "請稍後重試或聯繫客服支援",
          duration: 8000,
          style: {
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "white",
            border: "none",
            boxShadow: "0 10px 25px rgba(239, 68, 68, 0.3)",
          },
          icon: "❌",
        }
      );
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

    // 重置重試次數
    setPollRetryCount(0);

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
      const response = await apiClient.kindle.getStatus(id);

      if (!response.success) {
        throw new Error("獲取交付狀態失敗");
      }

      const delivery = response.data?.data;
      if (delivery) {
        setDeliveryStatus(delivery.status as DeliveryStatus);
        setErrorMessage(delivery.errorMessage || null);
        setPollRetryCount(0); // 重置重試次數

        // 如果狀態為已完成或失敗，停止輪詢
        if (delivery.status === "completed" || delivery.status === "failed") {
          stopStatusPolling();
        }
      }
    } catch (error) {
      console.error("獲取交付狀態失敗:", error);

      const newRetryCount = pollRetryCount + 1;
      setPollRetryCount(newRetryCount);

      // 連續失敗超過最大重試次數後停止輪詢
      if (newRetryCount >= MAX_POLL_RETRIES) {
        stopStatusPolling();
        setErrorMessage("無法獲取最新狀態，請稍後重新檢查或聯繫支持。");
        toast.error("無法獲取最新的傳送狀態，請稍後再試。", {
          description: "狀態更新失敗",
        });
      } else {
        // 顯示重試提示但不停止輪詢
        console.warn(
          `狀態查詢失敗，將重試 (${newRetryCount}/${MAX_POLL_RETRIES})`
        );
      }
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

  // 處理Kindle郵箱設定成功
  const handleEmailSetupSuccess = async () => {
    // 刷新用戶資訊
    await refreshAuth();
    // 關閉對話框
    setIsDialogOpen(false);
    // 顯示成功提示
    toast.success("Kindle郵箱設定成功！", {
      description: "現在可以發送EPUB到您的Kindle了",
      duration: 5000,
      style: {
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        color: "white",
        border: "none",
        boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
      },
      icon: "✅",
    });
  };

  // 獲取狀態文字
  const getStatusText = (status: DeliveryStatus | null) => {
    switch (status) {
      case "pending":
        return "等待處理";
      case "processing":
        return "發送中";
      case "completed":
        return "發送成功";
      case "failed":
        return "發送失敗";
      default:
        return "未知狀態";
    }
  };

  // 獲取按鈕文字
  const getButtonText = () => {
    if (isLoading) {
      return "發送中...";
    }
    if (isInCooldown) {
      return `重新發送 (${remainingSeconds}s)`;
    }
    return "發送到 Kindle";
  };

  return (
    <>
      <Button
        onClick={handleSendToKindle}
        disabled={isButtonDisabled}
        variant="outline"
        size="sm"
        className={
          isInCooldown
            ? "border-gray-300 text-gray-500 cursor-not-allowed"
            : "border-green-600 text-green-600 hover:bg-green-50"
        }
      >
        {isInCooldown && <Clock className="mr-1 h-3 w-3" />}
        {getButtonText()}
      </Button>

      {/* 對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {dialogMode === "form" && (
            <>
              <DialogHeader>
                <DialogTitle>設定 Kindle 電子郵件</DialogTitle>
                <DialogDescription>
                  請先設定您的 Kindle 電子郵件地址，以便接收 EPUB 檔案。
                </DialogDescription>
              </DialogHeader>
              <KindleEmailForm
                initialEmail={user?.kindleEmail}
                onSuccess={handleEmailSetupSuccess}
              />
            </>
          )}

          {dialogMode === "confirm" && (
            <>
              <DialogHeader>
                <DialogTitle>確認發送到 Kindle</DialogTitle>
                <DialogDescription>
                  確定要將此 EPUB 檔案發送到您的 Kindle 嗎？
                  <br />
                  <span className="text-sm text-gray-500">
                    發送地址：{user?.kindleEmail}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                  className="transition-all duration-200 hover:scale-105"
                >
                  取消
                </Button>
                <Button
                  onClick={confirmSendToKindle}
                  disabled={isLoading}
                  className={`bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-105 ${
                    isLoading ? "animate-pulse" : ""
                  }`}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isLoading ? "正在發送..." : "確認發送"}
                </Button>
              </div>
            </>
          )}

          {dialogMode === "status" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-green-600" />
                  發送狀態追蹤
                </DialogTitle>
                <DialogDescription>
                  正在追蹤您的 EPUB 發送狀態，請稍候...
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                    <div
                      className={`absolute inset-0 rounded-full border-4 border-t-transparent transition-all duration-500 ${
                        deliveryStatus === "completed"
                          ? "border-green-500"
                          : deliveryStatus === "failed"
                          ? "border-red-500"
                          : "border-blue-500 animate-spin"
                      }`}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {deliveryStatus === "completed" ? (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      ) : deliveryStatus === "failed" ? (
                        <XCircle className="h-8 w-8 text-red-500" />
                      ) : (
                        <Loader2 className="h-8 w-8 text-blue-500 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div
                    className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      deliveryStatus === "completed"
                        ? "bg-green-100 text-green-800 border-2 border-green-200"
                        : deliveryStatus === "failed"
                        ? "bg-red-100 text-red-800 border-2 border-red-200"
                        : deliveryStatus === "processing"
                        ? "bg-blue-100 text-blue-800 border-2 border-blue-200 animate-pulse"
                        : "bg-yellow-100 text-yellow-800 border-2 border-yellow-200"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${
                        deliveryStatus === "completed"
                          ? "bg-green-500"
                          : deliveryStatus === "failed"
                          ? "bg-red-500"
                          : "bg-blue-500 animate-pulse"
                      }`}
                    />
                    {getStatusText(deliveryStatus)}
                  </div>

                  {deliveryStatus === "completed" && (
                    <div className="mt-3 text-sm text-green-600 font-medium">
                      📱 請檢查您的 Kindle 設備或應用程式
                    </div>
                  )}

                  {deliveryStatus === "processing" && (
                    <div className="mt-3 text-sm text-blue-600">
                      ⏳ 正在將檔案發送到您的 Kindle...
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-red-800 text-sm">
                          錯誤詳情
                        </div>
                        <div className="text-red-700 text-sm mt-1">
                          {errorMessage}
                        </div>
                        {pollRetryCount > 0 && (
                          <div className="text-red-600 text-xs mt-2">
                            狀態查詢重試次數：{pollRetryCount}/
                            {MAX_POLL_RETRIES}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                {deliveryStatus === "completed" ||
                deliveryStatus === "failed" ? (
                  <Button
                    onClick={() => setIsDialogOpen(false)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    完成
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      stopStatusPolling();
                      setIsDialogOpen(false);
                    }}
                  >
                    在背景繼續
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/contexts";
import { useCooldown } from "@/lib/hooks/useCooldown";
import SendToKindleButton from "./SendToKindleButton";

interface UnifiedSendToKindleButtonProps {
  epubJobId: string;
  taskTitle?: string;
  variant?: "default" | "outline" | "kindle";
  size?: "sm" | "default" | "lg";
  disabled?: boolean;
  className?: string;
}

export default function UnifiedSendToKindleButton({
  epubJobId,
  taskTitle,
  variant = "kindle",
  size = "sm",
  disabled = false,
  className = "",
}: UnifiedSendToKindleButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const { isInCooldown, remainingSeconds } = useCooldown(epubJobId);

  const hasKindleEmail = Boolean(user?.kindleEmail);
  const isButtonDisabled =
    disabled || !hasKindleEmail || isInCooldown || !isAuthenticated;

  // 如果用戶未登入或沒有Kindle郵箱，顯示提示按鈕
  if (!isAuthenticated || !hasKindleEmail) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled={true}
        className={`border-gray-300 text-gray-400 cursor-not-allowed hover:scale-100 ${className}`}
        title={
          !isAuthenticated
            ? "請先登入以使用發送功能"
            : "請先設定 Kindle 電子郵件後啟用"
        }
      >
        <Send className="h-4 w-4 mr-1" />
        發送
      </Button>
    );
  }

  // 如果在冷卻中，顯示冷卻狀態
  if (isInCooldown) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled={true}
        className={`border-gray-300 text-gray-500 cursor-not-allowed hover:scale-100 ${className}`}
        title={`請等待 ${remainingSeconds} 秒後重新發送`}
      >
        <Clock className="h-4 w-4 mr-1" />
        發送 ({remainingSeconds}s)
      </Button>
    );
  }

  // 正常情況下使用SendToKindleButton組件
  return (
    <SendToKindleButton epubJobId={epubJobId} disabled={isButtonDisabled} />
  );
}

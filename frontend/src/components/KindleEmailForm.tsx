import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/contexts";
import axios from "@/lib/axios";
import AmazonKindleSetupGuide from "./AmazonKindleSetupGuide";

interface KindleEmailFormProps {
  initialEmail?: string;
  onSuccess?: () => void;
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

export default function KindleEmailForm({
  initialEmail = "",
  onSuccess,
}: KindleEmailFormProps) {
  const { user, refreshAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kindleEmail, setKindleEmail] = useState(
    initialEmail || user?.kindleEmail || ""
  );
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "guide" | "complete">("email");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const response = await axios.put("/api/user/profile", {
        kindleEmail: kindleEmail,
      });

      if (response.data) {
        // 更新本地用戶狀態 - 使用強制刷新確保立即更新
        await refreshAuth(true);

        // 顯示成功提示
        toast.success("您的Kindle郵箱已更新", {
          description: "設定成功",
        });

        // 如果是首次設定，顯示設定指南
        if (!initialEmail && !user?.kindleEmail) {
          setStep("guide");
          // 即使跳轉到指南，也要觸發頁面刷新
          // 但不關閉對話框，讓用戶完成指南流程
        } else {
          // 調用成功回調（修改情況）
          if (onSuccess) {
            onSuccess();
          }
        }
      }
    } catch (error: any) {
      console.error("更新Kindle郵箱失敗:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "更新Kindle郵箱時發生錯誤";
      setError(errorMessage);
      toast.error(errorMessage, {
        description: "設定失敗",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKindleEmail(value);

    // 清除錯誤信息（當用戶開始輸入時）
    if (error && value.trim()) {
      setError(null);
    }
  };

  const handleSetupGuideComplete = () => {
    setStep("complete");
    toast.success("Amazon Kindle 設定完成！", {
      description: "您現在可以直接將 EPUB 發送到 Kindle 了",
    });

    if (onSuccess) {
      onSuccess();
    }
  };

  const handleSetupGuideCancel = () => {
    setStep("email");
  };

  // 顯示設定指南
  if (step === "guide") {
    return (
      <AmazonKindleSetupGuide
        onComplete={handleSetupGuideComplete}
        onCancel={handleSetupGuideCancel}
      />
    );
  }

  // 顯示完成狀態
  if (step === "complete") {
    return (
      <div className="text-center space-y-4">
        <div className="text-green-600 text-lg font-semibold">
          ✅ 設定完成！
        </div>
        <p className="text-gray-600">
          您的 Kindle 電子郵件已設定完成，並且已完成 Amazon 認可寄件者設定。
        </p>
        <Button onClick={onSuccess} className="bg-green-600 hover:bg-green-700">
          完成
        </Button>
      </div>
    );
  }

  // 顯示郵箱設定表單
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="kindleEmail">Kindle 電子郵件</Label>
        <Input
          id="kindleEmail"
          type="email"
          placeholder="your-kindle@kindle.com"
          value={kindleEmail}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
        {error && (
          <Alert variant="destructive" className="py-2 mt-1">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-gray-500 mt-1">
          請輸入您的Kindle專屬郵箱，格式為 xxx@kindle.com 或
          xxx@kindle.amazon.com
        </p>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep("guide")}
          disabled={isSubmitting}
        >
          查看設定指南
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "儲存中..." : "儲存設定"}
        </Button>
      </div>
    </form>
  );
}

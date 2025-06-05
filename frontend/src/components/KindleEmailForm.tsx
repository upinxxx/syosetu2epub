import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/contexts";
import { apiClient } from "@/lib/api-client";
import type { UpdateProfileDto } from "@/lib/api-client";
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
      const requestData: UpdateProfileDto = {
        kindleEmail: kindleEmail,
      };

      const response = await apiClient.users.updateProfile(requestData);

      if (response.success) {
        // 顯示成功提示
        toast.success("您的Kindle郵箱已更新", {
          description: "設定成功",
        });

        // 更新本地用戶狀態 - 使用強制刷新確保立即更新
        // 等待 refreshAuth 完成以確保用戶狀態已更新
        await refreshAuth(true);

        // 短暫延遲確保狀態完全更新
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 每次儲存設定成功後都顯示設定指南
        setStep("guide");
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

  const handleSetupGuideComplete = async () => {
    setStep("complete");
    toast.success("Amazon Kindle 設定完成！", {
      description: "您現在可以直接將 EPUB 發送到 Kindle 了",
    });

    // 再次確保用戶狀態是最新的
    await refreshAuth(true);

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

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? "儲存中..." : "儲存設定"}
        </Button>
      </div>
    </form>
  );
}

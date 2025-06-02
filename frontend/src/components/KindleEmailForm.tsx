import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/contexts";
import axios from "@/lib/axios";

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
        // 更新本地用戶狀態
        await refreshAuth();

        // 顯示成功提示
        toast.success("您的Kindle郵箱已更新", {
          description: "設定成功",
        });

        // 調用成功回調
        if (onSuccess) {
          onSuccess();
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "儲存中..." : "儲存設定"}
        </Button>
      </div>
    </form>
  );
}

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";

// Kindle郵箱驗證schema
const kindleEmailSchema = z.object({
  kindleEmail: z
    .string()
    .email("請輸入有效的電子郵件地址")
    .refine(
      (email) =>
        email.endsWith("@kindle.com") || email.endsWith("@kindle.amazon.com"),
      {
        message: "必須是有效的Kindle郵箱 (@kindle.com 或 @kindle.amazon.com)",
      }
    ),
});

type KindleEmailFormData = z.infer<typeof kindleEmailSchema>;

interface KindleEmailFormProps {
  initialEmail?: string;
  onSuccess?: () => void;
}

export default function KindleEmailForm({
  initialEmail = "",
  onSuccess,
}: KindleEmailFormProps) {
  const { user, refreshAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KindleEmailFormData>({
    resolver: zodResolver(kindleEmailSchema),
    defaultValues: {
      kindleEmail: initialEmail || user?.kindleEmail || "",
    },
  });

  const onSubmit = async (data: KindleEmailFormData) => {
    try {
      setIsSubmitting(true);

      // 呼叫API更新用戶的Kindle郵箱
      const response = await fetch("/api/user/kindle-email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kindleEmail: data.kindleEmail }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "更新Kindle郵箱失敗");
      }

      // 更新本地用戶狀態
      await refreshAuth();

      // 顯示成功提示
      toast({
        title: "設定成功",
        description: "您的Kindle郵箱已更新",
      });

      // 調用成功回調
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("更新Kindle郵箱失敗:", error);
      toast({
        title: "設定失敗",
        description: error.message || "更新Kindle郵箱時發生錯誤",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="kindleEmail">Kindle 電子郵件</Label>
        <Input
          id="kindleEmail"
          placeholder="your-kindle@kindle.com"
          {...register("kindleEmail")}
        />
        {errors.kindleEmail && (
          <Alert variant="destructive" className="py-2 mt-1">
            <AlertDescription>{errors.kindleEmail.message}</AlertDescription>
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

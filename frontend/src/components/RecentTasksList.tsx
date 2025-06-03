import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import { useAuth } from "@/lib/contexts";
import { useCooldown } from "@/lib/hooks/useCooldown";

// 常數定義
const DEFAULT_DAYS = 7;
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

interface RecentTask {
  id: string;
  novelId: string;
  novelTitle?: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  publicUrl?: string;
  errorMessage?: string;
}

interface RecentTasksListProps {
  onSendToKindle?: (jobId: string) => void;
}

export default function RecentTasksList({
  onSendToKindle,
}: RecentTasksListProps) {
  const { user, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<RecentTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 檢查用戶是否已設定Kindle郵箱
  const hasKindleEmail = user?.kindleEmail && user.kindleEmail.trim() !== "";

  const fetchRecentTasks = async () => {
    // 檢查認證狀態
    if (!isAuthenticated || !user) {
      console.log("用戶未登入，跳過獲取最近任務");
      setTasks([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`開始獲取用戶 ${user.id} 的最近任務`);

      const response = await apiClient.users.getRecentJobs(DEFAULT_DAYS);

      console.log("最近任務 API 響應:", response);

      // 處理統一回應格式：{ success: true, data: { success: true, jobs: [...] }, timestamp }
      const jobsData = response.data?.jobs || response.data || [];

      if (response.success && Array.isArray(jobsData)) {
        setTasks(jobsData);
        console.log(`成功載入 ${jobsData.length} 筆最近任務`);

        if (jobsData.length === 0) {
          console.log("用戶暫無最近任務");
        }
      } else {
        console.warn("API 響應格式異常:", response);
        setTasks([]);
        setError("響應格式異常");
      }
    } catch (error: unknown) {
      console.error("獲取最近任務失敗:", error);
      setTasks([]);

      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error("API 錯誤詳情:", {
          status: error.response?.status,
          data: error.response?.data,
          message: errorMessage,
        });

        let userFriendlyMessage = "無法載入最近任務";

        if (error.response?.status === 401) {
          userFriendlyMessage = "登入已過期，請重新登入";
          setError("認證已過期");
        } else if (error.response?.status === 403) {
          userFriendlyMessage = "沒有權限查看最近任務";
          setError("權限不足");
        } else if (error.response?.status === 500) {
          userFriendlyMessage = "服務器錯誤，請稍後再試";
          setError("服務器錯誤");
        } else if (error.code === "NETWORK_ERROR") {
          userFriendlyMessage = "網絡連接錯誤，請檢查網絡";
          setError("網絡錯誤");
        } else {
          setError(`載入失敗: ${errorMessage}`);
        }

        toast.error(userFriendlyMessage);
      } else {
        setError("未知錯誤");
        toast.error("無法載入最近任務");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecentTasks();
  }, [user, isAuthenticated]);

  const handleRefresh = async () => {
    if (!isAuthenticated || !user) {
      toast.error("請先登入以查看最近任務");
      return;
    }

    setIsRefreshing(true);
    await fetchRecentTasks();
  };

  const handleDownload = (publicUrl: string, novelTitle?: string) => {
    try {
      if (!publicUrl) {
        toast.error("下載連結無效");
        return;
      }

      // 驗證 URL 格式
      try {
        new URL(publicUrl);
      } catch {
        toast.error("下載連結格式無效");
        return;
      }

      const link = document.createElement("a");
      link.href = publicUrl;
      link.download = `${novelTitle || "novel"}.epub`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("開始下載 EPUB 檔案", {
        description: novelTitle ? `正在下載：${novelTitle}` : "下載已開始",
      });
    } catch (error) {
      console.error("下載失敗:", error);
      toast.error("下載失敗，請稍後再試");
    }
  };

  const handleSendToKindle = (jobId: string) => {
    if (!hasKindleEmail) {
      toast.error("請先設定 Kindle 電子郵件", {
        description: "請到會員中心設定您的 Kindle 郵箱",
      });
      return;
    }

    if (onSendToKindle) {
      onSendToKindle(jobId);
    } else {
      toast.info("請先設定 Kindle 電子郵件");
    }
  };

  // 為每個任務建立冷卻狀態Hook
  const TaskSendButton = ({
    taskId,
    taskTitle,
  }: {
    taskId: string;
    taskTitle?: string;
  }) => {
    const { isInCooldown, remainingSeconds } = useCooldown(taskId);

    return (
      <Button
        onClick={() => handleSendToKindle(taskId)}
        size="sm"
        variant="outline"
        disabled={!hasKindleEmail || isInCooldown}
        className={
          !hasKindleEmail
            ? "border-gray-300 text-gray-400 cursor-not-allowed"
            : isInCooldown
            ? "border-gray-300 text-gray-500 cursor-not-allowed"
            : "border-green-600 text-green-600 hover:bg-green-50"
        }
        title={
          !hasKindleEmail
            ? "請先設定 Kindle 電子郵件後啟用"
            : isInCooldown
            ? `請等待 ${remainingSeconds} 秒後重新發送`
            : "發送到 Kindle"
        }
      >
        {isInCooldown && <Clock className="h-4 w-4 mr-1" />}
        <Send className="h-4 w-4 mr-1" />
        {isInCooldown ? `發送 (${remainingSeconds}s)` : "發送"}
      </Button>
    );
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toUpperCase();

    switch (normalizedStatus) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            已完成
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            處理中
          </Badge>
        );
      case "QUEUED":
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            排隊中
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            失敗
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            未知
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(
        "zh-TW",
        DATE_FORMAT_OPTIONS
      );
    } catch {
      return "日期格式錯誤";
    }
  };

  // 如果用戶未登入，顯示提示
  if (!isAuthenticated || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            最近任務
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">請登入以查看最近的轉換任務</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            最近任務
          </CardTitle>
          <Button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
            />
            重新整理
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && !isRefreshing ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">載入最近任務中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} size="sm" variant="outline">
              重試
            </Button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">暫無最近任務</p>
            <p className="text-sm text-gray-400">
              您在過去 {DEFAULT_DAYS} 天內沒有轉換任務
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900">
                        {task.novelTitle || "未知小說"}
                      </h3>
                      {getStatusBadge(task.status)}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      創建時間：{formatDate(task.createdAt)}
                    </p>
                    {task.completedAt && (
                      <p className="text-sm text-gray-500 mb-2">
                        完成時間：{formatDate(task.completedAt)}
                      </p>
                    )}
                    {task.errorMessage && (
                      <p className="text-sm text-red-600 mb-2">
                        錯誤：{task.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {task.status?.toUpperCase() === "COMPLETED" &&
                      task.publicUrl && (
                        <>
                          <Button
                            onClick={() =>
                              handleDownload(task.publicUrl!, task.novelTitle)
                            }
                            size="sm"
                            variant="outline"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            下載
                          </Button>
                          <TaskSendButton
                            taskId={task.id}
                            taskTitle={task.novelTitle}
                          />
                        </>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

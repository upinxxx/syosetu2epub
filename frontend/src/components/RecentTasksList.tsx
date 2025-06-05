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
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import { useAuth } from "@/lib/contexts";
import UnifiedSendToKindleButton from "./UnifiedSendToKindleButton";

// 常數定義
const DEFAULT_DAYS = 7;
const DEFAULT_LIMIT = 5;
const DEFAULT_PAGE = 1;
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
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
  showCard?: boolean; // 控制是否顯示Card包裝
}

export default function RecentTasksList({
  onSendToKindle,
  showCard = true,
}: RecentTasksListProps) {
  const { user, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<RecentTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshCooldown, setRefreshCooldown] = useState(false);

  // 檢查用戶是否已設定Kindle郵箱
  const hasKindleEmail = user?.kindleEmail && user.kindleEmail.trim() !== "";

  // 獲取最近任務（固定10筆）
  const loadRecentTasks = async () => {
    // 檢查認證狀態
    if (!isAuthenticated || !user) {
      setTasks([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("正在載入最近任務...");

      // 使用 getRecentJobs API，獲取最近7天內的任務
      const response = await apiClient.users.getRecentJobs(7);

      console.log("API 響應:", response);

      if (response.success) {
        if (response.data?.jobs) {
          // 包裝格式
          setTasks(response.data.jobs.slice(0, 10)); // 最多取10筆
          setLastUpdated(new Date());
          console.log(`成功載入 ${response.data.jobs.length} 項最近任務`);
        } else if ((response as any).jobs) {
          // 直接格式
          const jobs = (response as any).jobs;
          setTasks(jobs.slice(0, 10)); // 最多取10筆
          setLastUpdated(new Date());
          console.log(`成功載入 ${jobs.length} 項最近任務`);
        } else {
          console.warn("API 響應數據格式未知:", response);
          throw new Error("任務數據格式異常");
        }
      } else {
        console.warn("API 響應失敗:", response);
        throw new Error(response.message || "獲取最近任務失敗");
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
          userFriendlyMessage = "沒有權限查看任務歷史";
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

  // 初始載入
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("初始載入最近任務");
      loadRecentTasks().catch(console.error);
    } else {
      // 如果用戶未登入，清空任務列表
      setTasks([]);
      setError(null);
    }
  }, [isAuthenticated, user]);

  const handleRefresh = async () => {
    if (!isAuthenticated || !user) {
      toast.error("請先登入以查看最近任務");
      return;
    }

    // 防止頻繁點擊的節流處理
    if (refreshCooldown) {
      toast.info("請稍後再重新整理", {
        description: "為避免過度請求，請等待幾秒後再試",
        duration: 2000,
      });
      return;
    }

    setIsRefreshing(true);
    setRefreshCooldown(true);
    setShowRefreshSuccess(false);

    try {
      await loadRecentTasks();

      // 顯示成功動畫
      setShowRefreshSuccess(true);
      setTimeout(() => setShowRefreshSuccess(false), 1500);

      toast.success("重新整理完成", {
        description: "任務列表已更新",
        duration: 2000,
        style: {
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "white",
          border: "none",
          boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
        },
        icon: "✅",
      });
    } catch (error) {
      // loadRecentTasks 已經處理了錯誤
    }

    // 3秒後解除冷卻
    setTimeout(() => {
      setRefreshCooldown(false);
    }, 3000);
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

      // 修復：移除 target="_blank"，直接下載而不是開啟新分頁
      const link = document.createElement("a");
      link.href = publicUrl;
      link.download = `${novelTitle || "novel"}.epub`;
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
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours =
        Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

      // 如果是今天，只顯示時間
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString("zh-TW", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // 如果是一天內，顯示"昨天 HH:MM"
      if (diffInHours < 24) {
        return `昨天 ${date.toLocaleTimeString("zh-TW", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }

      // 其他情況顯示日期和時間
      return date.toLocaleDateString("zh-TW", DATE_FORMAT_OPTIONS);
    } catch {
      return "日期格式錯誤";
    }
  };

  // 如果用戶未登入，顯示提示
  if (!isAuthenticated || !user) {
    const content = (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">請登入以查看最近的轉換任務</p>
      </div>
    );

    if (!showCard) {
      return content;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            最近任務
          </CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  // 主要內容渲染
  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">載入任務歷史中...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} size="sm" variant="outline">
            重試
          </Button>
        </div>
      );
    }

    if (tasks.length === 0) {
      return (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">暫無任務記錄</p>
          <p className="text-sm text-gray-400">您還沒有任何轉換任務</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div
          className={`space-y-4 transition-all duration-500 ${
            isRefreshing
              ? "opacity-60 scale-[0.98] blur-[1px]"
              : showRefreshSuccess
              ? "opacity-100 scale-100 blur-0 animate-pulse"
              : "opacity-100 scale-100 blur-0"
          }`}
        >
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded-xl p-4 hover:bg-gray-50 transition-all duration-200 hover:shadow-md relative bg-white ${
                isRefreshing
                  ? "animate-pulse"
                  : showRefreshSuccess
                  ? "ring-2 ring-green-200 bg-green-50/30"
                  : ""
              }`}
            >
              {/* 響應式佈局 */}
              <div className="space-y-3">
                {/* 標題與狀態 */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium text-gray-900 leading-snug flex-1 min-w-0">
                    {task.novelTitle || "未知小說"}
                  </h3>
                  <div className="flex-shrink-0">
                    {getStatusBadge(task.status)}
                  </div>
                </div>

                {/* 時間資訊 */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span className="font-medium">創建</span>
                    <span className="text-gray-700">
                      {formatDate(task.createdAt)}
                    </span>
                  </div>
                  {task.completedAt && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span className="font-medium">完成</span>
                      <span className="text-gray-700">
                        {formatDate(task.completedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 錯誤信息 */}
                {task.errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="break-words">{task.errorMessage}</span>
                    </p>
                  </div>
                )}

                {/* 操作按鈕（只在完成狀態顯示）*/}
                {task.status?.toUpperCase() === "COMPLETED" &&
                  task.publicUrl && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-gray-100">
                      <Button
                        onClick={() =>
                          handleDownload(task.publicUrl!, task.novelTitle)
                        }
                        size="sm"
                        variant="download"
                        className="flex-1 sm:flex-none"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        下載檔案
                      </Button>
                      <UnifiedSendToKindleButton
                        epubJobId={task.id}
                        taskTitle={task.novelTitle}
                      />
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 根據showCard決定是否包裝在Card中
  if (!showCard) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing || refreshCooldown}
              size="sm"
              variant="outline"
              className={`transition-all duration-200 ${
                isRefreshing
                  ? "bg-blue-50 border-blue-200 text-blue-600 shadow-md"
                  : "hover:shadow-lg hover:scale-105"
              }`}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 transition-transform duration-200 ${
                  isRefreshing ? "animate-spin" : "hover:rotate-90"
                }`}
              />
              {isRefreshing ? "更新中..." : "重新整理"}
            </Button>
          </div>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing || refreshCooldown}
              size="sm"
              variant="outline"
              className={`transition-all duration-200 ${
                isRefreshing
                  ? "bg-blue-50 border-blue-200 text-blue-600 shadow-md"
                  : "hover:shadow-lg hover:scale-105"
              }`}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 transition-transform duration-200 ${
                  isRefreshing ? "animate-spin" : "hover:rotate-90"
                }`}
              />
              {isRefreshing ? "更新中..." : "重新整理"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}

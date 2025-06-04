import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/ui/pagination";
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
import { useCooldown } from "@/lib/hooks/useCooldown";

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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
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

  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_LIMIT);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    total: 0,
    hasMore: false,
  });

  // 檢查用戶是否已設定Kindle郵箱
  const hasKindleEmail = user?.kindleEmail && user.kindleEmail.trim() !== "";

  const fetchRecentTasks = async (
    page: number = currentPage,
    limit: number = itemsPerPage
  ) => {
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
      console.log(
        `開始獲取用戶 ${user.id} 的任務歷史 - 頁數: ${page}, 每頁: ${limit}`
      );

      // 使用支援分頁的 getJobHistory API
      const response = await apiClient.users.getJobHistory({ page, limit });

      console.log("任務歷史 API 響應:", response);

      // 根據 API 客戶端的標準化邏輯處理響應
      // API 客戶端會將後端的 { success, jobs, pagination } 包裝為 { success, data: { jobs, pagination } }
      if (response.success && response.data) {
        const historyData = response.data;

        // 檢查數據格式
        if (Array.isArray(historyData.jobs) && historyData.pagination) {
          setTasks(historyData.jobs);
          setPagination(historyData.pagination);
          setLastUpdated(new Date());
          console.log(
            `成功載入 ${historyData.jobs.length} 筆任務，總計 ${historyData.pagination.total} 筆`
          );

          if (historyData.jobs.length === 0 && page === 1) {
            console.log("用戶暫無任務歷史");
          }
        } else {
          console.warn("API 響應數據格式異常:", historyData);
          throw new Error("任務數據格式異常");
        }
      } else if (response.success) {
        // 處理後端直接返回格式的情況（沒有被 API 客戶端包裝）
        const directData = response as any;
        if (Array.isArray(directData.jobs) && directData.pagination) {
          setTasks(directData.jobs);
          setPagination(directData.pagination);
          setLastUpdated(new Date());
          console.log(
            `成功載入 ${directData.jobs.length} 筆任務，總計 ${directData.pagination.total} 筆`
          );
        } else {
          console.warn("直接響應格式異常:", directData);
          throw new Error("響應格式異常");
        }
      } else {
        console.warn("API 響應失敗:", response);
        throw new Error(response.message || "獲取任務歷史失敗");
      }
    } catch (error: unknown) {
      console.error("獲取任務歷史失敗:", error);
      setTasks([]);
      setPagination({
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
        total: 0,
        hasMore: false,
      });

      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error("API 錯誤詳情:", {
          status: error.response?.status,
          data: error.response?.data,
          message: errorMessage,
        });

        let userFriendlyMessage = "無法載入任務歷史";

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
        toast.error("無法載入任務歷史");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecentTasks();
  }, [user, isAuthenticated, currentPage, itemsPerPage]);

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
      await fetchRecentTasks(currentPage, itemsPerPage);

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
      // fetchRecentTasks 已經處理了錯誤
    }

    // 3秒後解除冷卻
    setTimeout(() => {
      setRefreshCooldown(false);
    }, 3000);
  };

  // 處理分頁變更
  const handlePageChange = (page: number) => {
    console.log(`分頁變更：從第 ${currentPage} 頁到第 ${page} 頁`);
    setCurrentPage(page);
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

  const handleSendToKindle = async (jobId: string) => {
    if (!hasKindleEmail) {
      toast.error("請先設定 Kindle 電子郵件", {
        description: "請到會員中心設定您的 Kindle 郵箱",
        duration: 5000,
        style: {
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "white",
          border: "none",
          boxShadow: "0 10px 25px rgba(245, 158, 11, 0.3)",
        },
        icon: "⚙️",
      });
      return;
    }

    if (onSendToKindle) {
      try {
        await onSendToKindle(jobId);
        toast.success("發送請求已提交", {
          description: "請稍後查看您的 Kindle 設備",
          duration: 4000,
          style: {
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            border: "none",
            boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
          },
          icon: "📚",
        });
      } catch (error) {
        toast.error("發送失敗", {
          description: "請稍後重試或聯繫客服支援",
          duration: 6000,
          style: {
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "white",
            border: "none",
            boxShadow: "0 10px 25px rgba(239, 68, 68, 0.3)",
          },
          icon: "❌",
        });
        throw error; // 重新拋出錯誤以便上層處理
      }
    } else {
      toast.info("請先設定 Kindle 電子郵件", {
        description: "功能尚未完全配置",
        duration: 3000,
        style: {
          background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          color: "white",
          border: "none",
          boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)",
        },
        icon: "ℹ️",
      });
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
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
      if (!hasKindleEmail || isInCooldown || isSending) return;

      setIsSending(true);
      try {
        await handleSendToKindle(taskId);
      } finally {
        setIsSending(false);
      }
    };

    return (
      <Button
        onClick={handleSend}
        size="sm"
        variant={!hasKindleEmail || isInCooldown ? "outline" : "kindle"}
        disabled={!hasKindleEmail || isInCooldown || isSending}
        className={
          !hasKindleEmail
            ? "border-gray-300 text-gray-400 cursor-not-allowed hover:scale-100"
            : isInCooldown
            ? "border-gray-300 text-gray-500 cursor-not-allowed hover:scale-100"
            : isSending
            ? "animate-pulse"
            : ""
        }
        title={
          !hasKindleEmail
            ? "請先設定 Kindle 電子郵件後啟用"
            : isInCooldown
            ? `請等待 ${remainingSeconds} 秒後重新發送`
            : isSending
            ? "正在發送中..."
            : "發送到 Kindle"
        }
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : isInCooldown ? (
          <Clock className="h-4 w-4 mr-1" />
        ) : (
          <Send className="h-4 w-4 mr-1" />
        )}
        {isSending
          ? "發送中..."
          : isInCooldown
          ? `發送 (${remainingSeconds}s)`
          : "發送"}
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
                      <TaskSendButton
                        taskId={task.id}
                        taskTitle={task.novelTitle}
                      />
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>

        {/* 分頁元件 */}
        {pagination.total > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={Math.ceil(pagination.total / pagination.limit)}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={handlePageChange}
              showItemsPerPage={true}
              showTotalItems={true}
              disabled={isLoading || isRefreshing}
            />
          </div>
        )}
      </div>
    );
  };

  // 根據showCard決定是否包裝在Card中
  if (!showCard) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">
                上次更新：{lastUpdated.toLocaleTimeString("zh-TW")}
              </p>
            )}
          </div>
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
        <div className="flex items-center justify-between">
          <div>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">
                上次更新：{lastUpdated.toLocaleTimeString("zh-TW")}
              </p>
            )}
          </div>
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

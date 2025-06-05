import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import Portal from "@/components/Portal";
import { apiClient } from "@/lib/api-client";
import type {
  PreviewNovelDto,
  ConvertNovelDto,
  PreviewResponse,
  SendToKindleDto,
  NovelPreview,
} from "@/lib/api-client";
import { useAuth } from "@/lib/contexts";
import {
  X,
  DownloadCloud,
  ChevronUp,
  ChevronDown,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  History,
  Send,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { handleError, validateApiResponse } from "@/lib/error-handler";
import { debug } from "@/lib/debug.js";

// 動態載入大型元件
const Layout = React.lazy(() => import("@/components/Layout"));
const SendToKindleButton = React.lazy(
  () => import("@/components/SendToKindleButton")
);
const RecentTasksModal = React.lazy(
  () => import("@/components/RecentTasksModal")
);

// 功能特點資料
const features = [
  {
    title: "快速轉換",
    description: "只需輸入網址，系統自動爬取並轉換為 EPUB 格式",
    icon: "⚡",
    gradient: "from-blue-500 to-blue-600",
    color: "text-blue-600",
    bgLight: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    title: "Kindle 支援",
    description: "登入後支援直接轉寄至 Kindle 信箱，即時同步閱讀",
    icon: "📱",
    gradient: "from-green-500 to-green-600",
    color: "text-green-600",
    bgLight: "bg-green-50",
    border: "border-green-200",
  },
  {
    title: "任務追蹤",
    description: "即時追蹤轉換進度，支援任務歷史查詢與狀態監控",
    icon: "📊",
    gradient: "from-purple-500 to-purple-600",
    color: "text-purple-600",
    bgLight: "bg-purple-50",
    border: "border-purple-200",
  },
  {
    title: "安全可靠",
    description: "系統穩定，資料安全，支援多平台部署與備份機制",
    icon: "🔒",
    gradient: "from-orange-500 to-orange-600",
    color: "text-orange-600",
    bgLight: "bg-orange-50",
    border: "border-orange-200",
  },
];

// 站點定義
const NOVEL_SITES = {
  NAROU: "narou",
  KAKUYOMU: "kakuyomu",
};

// 預覽小說介面 - 移除重複定義，使用從 api-client 導入的類型

// 預覽任務狀態類型
type PreviewJobStatus = "queued" | "processing" | "completed" | "failed";

// 預覽任務響應介面
interface PreviewJobResponse {
  success: boolean;
  cached?: boolean;
  jobId?: string;
  novelId?: string;
  preview?: NovelPreview;
  status?: PreviewJobStatus;
  message?: string;
}

// 轉檔任務狀態類型 - 增加更多狀態
type ConversionJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "retrying"
  | "cancelled";

// 任務詳細信息介面
interface JobDetails {
  status: ConversionJobStatus;
  title: string;
  source: string;
  publicUrl?: string;
  progress?: number;
  estimatedTimeRemaining?: number;
  currentStep?: string;
  startTime: Date;
  lastUpdated: Date;
  retryCount: number;
  errorMessage?: string;
}

// 隨機生成柔和的明亮色彩
const getRandomSoftColor = () => {
  // 柔和明亮的顏色組合 - 增強版本，添加更多視覺層次和動畫效果
  const colors = [
    {
      border: "border-teal-500",
      bg: "bg-teal-500",
      text: "text-teal-600",
      hover: "hover:bg-teal-600",
      light: "bg-teal-50",
      gradient: "from-teal-500 to-teal-600",
      shadow: "shadow-teal-500/20",
      ring: "ring-teal-500/30",
      textLight: "text-teal-500",
      bgLight: "bg-teal-100",
      hoverShadow: "hover:shadow-teal-500/30",
      focusRing: "focus:ring-teal-500/50",
      glowEffect: "shadow-[0_0_20px_rgba(20,184,166,0.15)]",
      gradientHover: "hover:from-teal-400 hover:to-teal-500",
    },
    {
      border: "border-sky-500",
      bg: "bg-sky-500",
      text: "text-sky-600",
      hover: "hover:bg-sky-600",
      light: "bg-sky-50",
      gradient: "from-sky-500 to-sky-600",
      shadow: "shadow-sky-500/20",
      ring: "ring-sky-500/30",
      textLight: "text-sky-500",
      bgLight: "bg-sky-100",
      hoverShadow: "hover:shadow-sky-500/30",
      focusRing: "focus:ring-sky-500/50",
      glowEffect: "shadow-[0_0_20px_rgba(14,165,233,0.15)]",
      gradientHover: "hover:from-sky-400 hover:to-sky-500",
    },
    {
      border: "border-indigo-500",
      bg: "bg-indigo-500",
      text: "text-indigo-600",
      hover: "hover:bg-indigo-600",
      light: "bg-indigo-50",
      gradient: "from-indigo-500 to-indigo-600",
      shadow: "shadow-indigo-500/20",
      ring: "ring-indigo-500/30",
      textLight: "text-indigo-500",
      bgLight: "bg-indigo-100",
      hoverShadow: "hover:shadow-indigo-500/30",
      focusRing: "focus:ring-indigo-500/50",
      glowEffect: "shadow-[0_0_20px_rgba(99,102,241,0.15)]",
      gradientHover: "hover:from-indigo-400 hover:to-indigo-500",
    },
    {
      border: "border-violet-500",
      bg: "bg-violet-500",
      text: "text-violet-600",
      hover: "hover:bg-violet-600",
      light: "bg-violet-50",
      gradient: "from-violet-500 to-violet-600",
      shadow: "shadow-violet-500/20",
      ring: "ring-violet-500/30",
      textLight: "text-violet-500",
      bgLight: "bg-violet-100",
      hoverShadow: "hover:shadow-violet-500/30",
      focusRing: "focus:ring-violet-500/50",
      glowEffect: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
      gradientHover: "hover:from-violet-400 hover:to-violet-500",
    },
    {
      border: "border-rose-500",
      bg: "bg-rose-500",
      text: "text-rose-600",
      hover: "hover:bg-rose-600",
      light: "bg-rose-50",
      gradient: "from-rose-500 to-rose-600",
      shadow: "shadow-rose-500/20",
      ring: "ring-rose-500/30",
      textLight: "text-rose-500",
      bgLight: "bg-rose-100",
      hoverShadow: "hover:shadow-rose-500/30",
      focusRing: "focus:ring-rose-500/50",
      glowEffect: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
      gradientHover: "hover:from-rose-400 hover:to-rose-500",
    },
    {
      border: "border-emerald-500",
      bg: "bg-emerald-500",
      text: "text-emerald-600",
      hover: "hover:bg-emerald-600",
      light: "bg-emerald-50",
      gradient: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-500/20",
      ring: "ring-emerald-500/30",
      textLight: "text-emerald-500",
      bgLight: "bg-emerald-100",
      hoverShadow: "hover:shadow-emerald-500/30",
      focusRing: "focus:ring-emerald-500/50",
      glowEffect: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
      gradientHover: "hover:from-emerald-400 hover:to-emerald-500",
    },
    {
      border: "border-cyan-500",
      bg: "bg-cyan-500",
      text: "text-cyan-600",
      hover: "hover:bg-cyan-600",
      light: "bg-cyan-50",
      gradient: "from-cyan-500 to-cyan-600",
      shadow: "shadow-cyan-500/20",
      ring: "ring-cyan-500/30",
      textLight: "text-cyan-500",
      bgLight: "bg-cyan-100",
      hoverShadow: "hover:shadow-cyan-500/30",
      focusRing: "focus:ring-cyan-500/50",
      glowEffect: "shadow-[0_0_20px_rgba(6,182,212,0.15)]",
      gradientHover: "hover:from-cyan-400 hover:to-cyan-500",
    },
    {
      border: "border-amber-500",
      bg: "bg-amber-500",
      text: "text-amber-600",
      hover: "hover:bg-amber-600",
      light: "bg-amber-50",
      gradient: "from-amber-500 to-amber-600",
      shadow: "shadow-amber-500/20",
      ring: "ring-amber-500/30",
      textLight: "text-amber-500",
      bgLight: "bg-amber-100",
      hoverShadow: "hover:shadow-amber-500/30",
      focusRing: "focus:ring-amber-500/50",
      glowEffect: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
      gradientHover: "hover:from-amber-400 hover:to-amber-500",
    },
    {
      border: "border-pink-500",
      bg: "bg-pink-500",
      text: "text-pink-600",
      hover: "hover:bg-pink-600",
      light: "bg-pink-50",
      gradient: "from-pink-500 to-pink-600",
      shadow: "shadow-pink-500/20",
      ring: "ring-pink-500/30",
      textLight: "text-pink-500",
      bgLight: "bg-pink-100",
      hoverShadow: "hover:shadow-pink-500/30",
      focusRing: "focus:ring-pink-500/50",
      glowEffect: "shadow-[0_0_20px_rgba(236,72,153,0.15)]",
      gradientHover: "hover:from-pink-400 hover:to-pink-500",
    },
  ];

  return colors[Math.floor(Math.random() * colors.length)];
};

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<NovelPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewJobStatus | null>(
    null
  );
  // 更新 activeJobs 的類型定義
  const [activeJobs, setActiveJobs] = useState<Map<string, JobDetails>>(
    new Map()
  );
  const [previewColor, setPreviewColor] = useState(getRandomSoftColor());
  const [statusBarCollapsed, setStatusBarCollapsed] = useState(false);
  const [isRecentTasksModalOpen, setIsRecentTasksModalOpen] = useState(false);
  // 新增狀態管理
  const [pollingIntervals, setPollingIntervals] = useState<
    Map<string, NodeJS.Timeout>
  >(new Map());
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // 🆕 預覽任務專用的智能輪詢頻率計算
  const getPreviewPollingInterval = (
    status: PreviewJobStatus,
    retryCount: number = 0
  ): number => {
    switch (status) {
      case "queued":
        return 1500; // 排隊中，1.5秒檢查一次（比轉檔更頻繁）
      case "processing":
        return 1000; // 處理中，1秒檢查一次（預覽處理較快）
      case "completed":
      case "failed":
        return 0; // 終止狀態，停止輪詢
      default:
        return 1500;
    }
  };

  // 🆕 預覽任務輪詢狀態管理
  const [previewPollingInterval, setPreviewPollingInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [previewRetryCount, setPreviewRetryCount] = useState(0);

  // 🆕 清理預覽輪詢定時器
  const clearPreviewPolling = () => {
    if (previewPollingInterval) {
      clearTimeout(previewPollingInterval);
      setPreviewPollingInterval(null);
    }
    setPreviewRetryCount(0);
  };

  // 🆕 優化的預覽任務輪詢函數
  const pollPreviewJob = async (jobId: string, retryCount: number = 0) => {
    try {
      const response = await apiClient.novels.getPreviewStatus(jobId, {
        skipCache: true,
      });
      if (!response.success) {
        const errorMsg = response.message || "檢查預覽狀態失敗";
        console.error("❌ API 響應失敗:", errorMsg);
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        clearPreviewPolling();
        return;
      }

      // 獲取狀態並轉換為前端使用的狀態類型
      let status: PreviewJobStatus;

      // 將後端返回的狀態映射到前端狀態
      const rawStatus = response.data?.status;

      switch (String(rawStatus)) {
        case "completed":
        case "COMPLETED":
          status = "completed";
          break;
        case "failed":
        case "FAILED":
          status = "failed";
          break;
        case "processing":
        case "PROCESSING":
          status = "processing";
          break;
        case "queued":
        case "QUEUED":
          status = "queued";
          break;
        default:
          console.warn(`⚠️ 未知的任務狀態: ${rawStatus}，默認為 queued`);
          status = "queued";
      }

      setPreviewStatus(status);

      // 根據任務狀態處理
      switch (status) {
        case "completed":
          clearPreviewPolling();
          if (response.data?.preview) {
            // 每次顯示預覽時重新生成隨機顏色
            setPreviewColor(getRandomSoftColor());
            setPreview(response.data.preview);
            setShowPreview(true);
            toast.success("小說預覽載入成功！");
          } else {
            console.error("預覽數據不完整");
            const errorMsg = "預覽數據不完整";
            setError(errorMsg);
            toast.error(errorMsg);
          }
          setIsLoading(false);
          break;

        case "failed":
          clearPreviewPolling();
          const failureMsg = response.message || "獲取預覽失敗";
          setError(failureMsg);
          toast.error(failureMsg);
          setIsLoading(false);
          break;

        case "processing":
        case "queued":
          // 🆕 使用智能輪詢間隔
          const interval = getPreviewPollingInterval(status, retryCount);

          const timeoutId = setTimeout(() => {
            pollPreviewJob(jobId, retryCount);
          }, interval);
          setPreviewPollingInterval(timeoutId);
          break;

        default:
          clearPreviewPolling();
          const unknownMsg = "未知的預覽任務狀態";
          setError(unknownMsg);
          toast.error(unknownMsg);
          setIsLoading(false);
      }

      // 重置重試計數器（成功請求後）
      setPreviewRetryCount(0);
    } catch (error: any) {
      console.error("輪詢預覽任務失敗:", error);

      const standardError = handleError(error, {
        context: "檢查預覽狀態",
        showToast: false, // 避免過多通知
      });

      // 根據錯誤類型決定是否重試
      const shouldRetry = standardError.shouldRetry && retryCount < 6;
      const retryDelay = standardError.retryDelay || 3000;

      if (shouldRetry) {
        const newRetryCount = retryCount + 1;
        setPreviewRetryCount(newRetryCount);

        const timeoutId = setTimeout(() => {
          pollPreviewJob(jobId, newRetryCount);
        }, retryDelay);
        setPreviewPollingInterval(timeoutId);

        // 只在前幾次重試時顯示錯誤提示，避免過多通知
        if (newRetryCount <= 2) {
          toast.warning(`${standardError.userMessage}，正在重試...`);
        }
      } else {
        clearPreviewPolling();
        setError(standardError.userMessage);
        toast.error(standardError.userMessage);
        setIsLoading(false);
      }
    }
  };

  // 組件掛載時設置一個隨機顏色
  useEffect(() => {
    setPreviewColor(getRandomSoftColor());
  }, []);

  // 登入處理函數
  const handleLogin = () => {
    // 獲取後端 API URL
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

    // 重定向到 Google OAuth 登入頁面
    window.location.href = `${apiUrl}/api/v1/auth/google`;
  };

  // 🆕 組件清理時清理所有輪詢
  useEffect(() => {
    return () => {
      clearPreviewPolling();
      // 清理轉檔任務輪詢
      pollingIntervals.forEach((interval) => {
        clearTimeout(interval);
      });
    };
  }, []);

  // 驗證輸入的網址或 ID
  useEffect(() => {
    if (!input.trim()) {
      setError("");
      setSource("");
      setSourceId("");
      return;
    }

    // 解析輸入內容
    let detectedSource = "";
    let detectedSourceId = "";

    // 檢查是否為 kakuyomu 網址
    const kakuyomuUrlPattern = /^https:\/\/kakuyomu\.jp\/works\/(\d+)/;
    const kakuyomuMatch = input.match(kakuyomuUrlPattern);

    // 檢查是否為 narou 網址
    const narouUrlPattern = /^https:\/\/ncode\.syosetu\.com\/(n\w+)/;
    const narouMatch = input.match(narouUrlPattern);

    // 直接檢查是否為 kakuyomu 的 ID (純數字)
    const kakuyomuIdPattern = /^\d+$/;

    // 檢查是否為 narou 的 ID (n 開頭)
    const narouIdPattern = /^n\w+$/;

    const rules = [
      {
        cond: kakuyomuMatch,
        site: NOVEL_SITES.KAKUYOMU,
        id: kakuyomuMatch?.[1],
      },
      { cond: narouMatch, site: NOVEL_SITES.NAROU, id: narouMatch?.[1] },
      {
        cond: kakuyomuIdPattern.test(input),
        site: NOVEL_SITES.KAKUYOMU,
        id: input,
      },
      { cond: narouIdPattern.test(input), site: NOVEL_SITES.NAROU, id: input },
    ];

    const match = rules.find((rule) => Boolean(rule.cond));
    if (!match || !match.id) {
      setError("請輸入正確的網址或作品 ID");
      setSource("");
      setSourceId("");
      return;
    }

    detectedSource = match.site;
    detectedSourceId = match.id;

    // 設置驗證後的資訊
    setSource(detectedSource);
    setSourceId(detectedSourceId);
    setError("");
  }, [input]);

  // 處理下載請求
  const handleDownload = async () => {
    if (!source || !sourceId) {
      const errorMsg = "請輸入正確的網址或作品 ID";
      debug.warn("PREVIEW_REQUEST", "預覽請求參數無效", {
        source,
        sourceId,
        errorMessage: errorMsg,
      });
      setError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError("");

    debug.info("PREVIEW_REQUEST", "開始請求小說預覽", {
      source,
      sourceId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 確保請求數據格式正確
      const requestData: PreviewNovelDto = {
        source,
        sourceId,
      };

      debug.debug("PREVIEW_REQUEST", "發送預覽請求", {
        requestData,
        endpoint: "/api/v1/novels/preview",
      });

      // 提交預覽請求
      const response = await apiClient.novels.preview(requestData);

      debug.debug("PREVIEW_RESPONSE", "收到預覽響應", {
        response,
        responseStructure: Object.keys(response || {}),
        hasCachedData: !!(response?.data?.cached || (response as any)?.cached),
        hasPreviewData: !!(
          response?.data?.preview || (response as any)?.preview
        ),
        hasJobId: !!(response?.data?.jobId || (response as any)?.jobId),
      });

      // 使用統一響應驗證
      const validation = validateApiResponse<PreviewResponse>(
        response,
        "獲取小說預覽"
      );
      if (!validation.isValid) {
        debug.warn("PREVIEW_VALIDATION", "預覽響應驗證失敗", {
          validationError: validation.error,
          response,
        });
        if (validation.error) {
          setError(validation.error.userMessage);
        }
        setIsLoading(false);
        return;
      }

      const responseData = validation.data!;

      // 🆕 統一處理：優先處理緩存結果
      if (responseData.cached && responseData.preview) {
        // 緩存命中，立即顯示
        debug.info("PREVIEW_CACHE_HIT", "緩存命中，立即顯示預覽", {
          novelId: responseData.preview.novelId,
          title: responseData.preview.title,
          author: responseData.preview.author,
          source: responseData.preview.source,
        });

        setPreviewColor(getRandomSoftColor());
        setPreview(responseData.preview);
        setShowPreview(true);
        setIsLoading(false);
        toast.success("小說預覽載入成功！（來自緩存）");
        return;
      }

      // 🆕 非緩存結果，開始輪詢
      if (responseData.jobId) {
        debug.info("PREVIEW_JOB_CREATED", "創建預覽任務，開始輪詢", {
          jobId: responseData.jobId,
          source,
          sourceId,
        });

        setPreviewJobId(responseData.jobId);
        setPreviewStatus("queued");
        toast.info("正在處理預覽請求，請稍候...");
        // 🆕 使用新的輪詢機制
        pollPreviewJob(responseData.jobId, 0);
      } else {
        // 處理舊格式回應（向後相容）
        const errorMsg = "獲取預覽任務 ID 失敗";
        debug.error("PREVIEW_REQUEST", "響應中缺少 jobId", {
          responseData,
          errorMessage: errorMsg,
        });
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
      }
    } catch (error: any) {
      debug.error("PREVIEW_REQUEST", "獲取預覽失敗", {
        error,
        errorType: error?.constructor?.name,
        errorCode: error?.code,
        errorStatus: error?.response?.status,
        source,
        sourceId,
      });
      handlePreviewError(error);
    }
  };

  // 🆕 簡化的錯誤處理函數 - 使用統一錯誤處理工具
  const handlePreviewError = (error: any) => {
    debug.error("PREVIEW_ERROR", "預覽請求錯誤處理", {
      error,
      context: "獲取小說預覽",
    });

    const standardError = handleError(error, {
      context: "獲取小說預覽",
      showToast: true,
    });

    setError(standardError.userMessage);
    setIsLoading(false);
  };

  // 智能輪詢頻率計算
  const getPollingInterval = (
    status: ConversionJobStatus,
    retryCount: number
  ): number => {
    switch (status) {
      case "queued":
        return 5000; // 排隊中，5秒檢查一次
      case "processing":
        return 3000; // 處理中，3秒檢查一次
      case "retrying":
        return Math.min(8000 + retryCount * 2000, 20000); // 重試中，逐漸增加間隔
      case "completed":
      case "failed":
      case "cancelled":
        return 0; // 終止狀態，停止輪詢
      default:
        return 5000;
    }
  };

  // 清理輪詢定時器
  const clearPollingInterval = (jobId: string) => {
    const interval = pollingIntervals.get(jobId);
    if (interval) {
      clearTimeout(interval);
      setPollingIntervals((prev) => {
        const newMap = new Map(prev);
        newMap.delete(jobId);
        return newMap;
      });
    }
  };

  // 增強的輪詢任務狀態
  const pollJobStatus = async (
    jobId: string,
    title: string,
    source: string
  ) => {
    try {
      debug.info("JOB_POLLING", `開始檢查轉檔任務狀態: ${jobId}`, {
        jobId,
        title,
        source,
      });

      const response = await apiClient.conversions.getStatus(jobId, {
        skipCache: true,
      });

      // 記錄完整響應數據和格式驗證
      debug.debug("JOB_POLLING", `轉檔任務 ${jobId} API 響應`, {
        jobId,
        response,
        responseStructure: Object.keys(response || {}),
      });

      // 驗證響應格式
      const {
        isValid,
        data: validatedData,
        error: validationError,
      } = validateApiResponse(response, "轉檔狀態查詢");

      if (!isValid || !response.success) {
        const errorMsg =
          validationError?.userMessage ||
          response.message ||
          "檢查任務狀態失敗";

        debug.warn("JOB_POLLING", `任務狀態查詢失敗: ${jobId}`, {
          jobId,
          error: errorMsg,
          validationError,
          response,
        });

        updateJobStatus(jobId, "failed", errorMsg);
        toast.error(`任務失敗：${title} - ${errorMsg}`);
        clearPollingInterval(jobId);
        return;
      }

      // 正確解析狀態：從 ApiResponse 包裝中提取數據
      // response 的結構是 ApiResponse<ConversionStatusResponse>
      // 如果有 data 字段，使用 response.data，否則使用 response 本身（向後兼容）
      let statusSource: any;

      if ("data" in response && response.data) {
        // 新的統一格式：{ success: true, data: ConversionStatusResponse }
        statusSource = response.data;
        debug.verbose("JOB_POLLING", `使用統一格式響應: ${jobId}`, {
          statusSource,
        });
      } else {
        // 直接返回的格式：ConversionStatusResponse（包含 success 字段）
        statusSource = response;
        debug.verbose("JOB_POLLING", `使用直接格式響應: ${jobId}`, {
          statusSource,
        });
      }

      // 將後端返回的狀態映射到前端狀態
      let status: ConversionJobStatus;

      const rawStatus = statusSource?.status;

      debug.debug("JOB_POLLING", `轉檔任務狀態解析: ${jobId}`, {
        jobId,
        rawStatus,
        statusSource: {
          ...statusSource,
          // 不記錄可能的敏感信息
          publicUrl: statusSource?.publicUrl ? "[URL]" : undefined,
        },
      });

      switch (String(rawStatus)) {
        case "completed":
        case "COMPLETED":
          status = "completed";
          break;
        case "failed":
        case "FAILED":
          status = "failed";
          break;
        case "processing":
        case "PROCESSING":
          status = "processing";
          break;
        case "queued":
        case "QUEUED":
          status = "queued";
          break;
        case "retrying":
        case "RETRYING":
          status = "retrying";
          break;
        case "cancelled":
        case "CANCELLED":
          status = "cancelled";
          break;
        default:
          debug.warn("JOB_POLLING", `未知的轉檔任務狀態: ${jobId}`, {
            jobId,
            rawStatus,
            fallbackStatus: "failed",
          });
          status = "failed";
      }

      debug.info("JOB_POLLING", `轉檔任務狀態轉換: ${jobId}`, {
        jobId,
        rawStatus,
        finalStatus: status,
        hasPublicUrl: !!statusSource?.publicUrl,
        progress: statusSource?.progress,
        currentStep: statusSource?.currentStep,
      });

      const publicUrl = statusSource?.publicUrl;
      const progress = statusSource?.progress;
      const estimatedTimeRemaining = statusSource?.estimatedTimeRemaining;
      const currentStep = statusSource?.currentStep;

      // 更新任務狀態
      updateJobStatus(
        jobId,
        status,
        undefined,
        publicUrl,
        progress,
        estimatedTimeRemaining,
        currentStep
      );

      // 根據任務狀態處理
      switch (status) {
        case "completed":
          // 任務完成，停止輪詢
          clearPollingInterval(jobId);
          debug.info("JOB_COMPLETED", `轉檔任務完成: ${jobId}`, {
            jobId,
            title,
            hasDownloadUrl: !!publicUrl,
          });
          toast.success(`轉檔完成：${title}`, {
            action: {
              label: "下載",
              onClick: () => {
                if (publicUrl) {
                  debug.info("JOB_DOWNLOAD", `開始下載: ${jobId}`, {
                    jobId,
                    title,
                  });
                  // 修復：直接下載而不是開啟新分頁
                  const link = document.createElement("a");
                  link.href = publicUrl;
                  link.download = `${title || "novel"}.epub`;
                  link.rel = "noopener noreferrer";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              },
            },
          });
          break;

        case "failed":
        case "cancelled":
          // 任務失敗或取消，停止輪詢
          clearPollingInterval(jobId);
          const failureMsg =
            statusSource?.message ||
            (status === "cancelled" ? "任務已取消" : "轉檔過程發生錯誤");

          debug.warn("JOB_FAILED", `轉檔任務失敗或取消: ${jobId}`, {
            jobId,
            title,
            status,
            errorMessage: failureMsg,
          });

          updateJobStatus(jobId, status, failureMsg);
          toast.error(
            `${
              status === "cancelled" ? "任務取消" : "轉檔失敗"
            }：${title} - ${failureMsg}`
          );
          break;

        case "queued":
        case "processing":
        case "retrying":
          // 繼續輪詢，使用智能間隔
          const currentJob = activeJobs.get(jobId);
          const retryCount = currentJob?.retryCount || 0;
          const interval = getPollingInterval(status, retryCount);

          debug.verbose("JOB_POLLING", `繼續輪詢任務: ${jobId}`, {
            jobId,
            status,
            retryCount,
            nextPollInterval: interval,
            currentStep,
            progress,
          });

          if (interval > 0) {
            const timeoutId = setTimeout(
              () => pollJobStatus(jobId, title, source),
              interval
            );
            setPollingIntervals((prev) => {
              const newMap = new Map(prev);
              newMap.set(jobId, timeoutId);
              return newMap;
            });
          }
          break;

        default:
          clearPollingInterval(jobId);
          debug.error("JOB_POLLING", `任務狀態異常: ${jobId}`, {
            jobId,
            status,
            title,
          });
          updateJobStatus(jobId, "failed", "未知的任務狀態");
          toast.error(`任務狀態異常：${title}`);
      }

      // 更新最後同步時間
      setLastSyncTime(new Date());
    } catch (error: any) {
      debug.error("JOB_POLLING", `輪詢任務狀態失敗: ${jobId}`, {
        jobId,
        title,
        error,
        errorType: error?.constructor?.name,
        errorCode: error?.code,
        errorStatus: error?.response?.status,
      });

      const standardError = handleError(error, {
        context: "檢查轉檔狀態",
        showToast: false, // 避免過多通知
      });

      const currentJob = activeJobs.get(jobId);
      const retryCount = (currentJob?.retryCount || 0) + 1;

      // 根據錯誤類型和重試次數決定是否重試
      const shouldRetry = standardError.shouldRetry && retryCount < 5;
      const retryDelay = standardError.retryDelay || 8000;

      debug.info("JOB_POLLING", `決定重試策略: ${jobId}`, {
        jobId,
        retryCount,
        maxRetries: 5,
        shouldRetry,
        retryDelay,
        errorType: standardError.type,
      });

      if (shouldRetry) {
        // 更新為重試狀態
        updateJobStatus(
          jobId,
          "retrying",
          `${standardError.userMessage}，正在重試... (${retryCount}/5)`,
          undefined,
          undefined,
          undefined,
          undefined,
          retryCount
        );

        const timeoutId = setTimeout(
          () => pollJobStatus(jobId, title, source),
          retryDelay
        );
        setPollingIntervals((prev) => {
          const newMap = new Map(prev);
          newMap.set(jobId, timeoutId);
          return newMap;
        });
      } else {
        clearPollingInterval(jobId);
        updateJobStatus(jobId, "failed", standardError.userMessage);
        toast.error(`${title} - ${standardError.userMessage}`);
      }
    }
  };

  // 增強的更新任務狀態函數
  const updateJobStatus = (
    jobId: string,
    status: ConversionJobStatus,
    errorMessage?: string,
    publicUrl?: string,
    progress?: number,
    estimatedTimeRemaining?: number,
    currentStep?: string,
    retryCount?: number
  ) => {
    setActiveJobs((prev) => {
      const newMap = new Map(prev);
      const existingJob = newMap.get(jobId);

      if (existingJob) {
        newMap.set(jobId, {
          ...existingJob,
          status,
          publicUrl: publicUrl || existingJob.publicUrl,
          progress: progress !== undefined ? progress : existingJob.progress,
          estimatedTimeRemaining:
            estimatedTimeRemaining !== undefined
              ? estimatedTimeRemaining
              : existingJob.estimatedTimeRemaining,
          currentStep: currentStep || existingJob.currentStep,
          lastUpdated: new Date(),
          retryCount:
            retryCount !== undefined ? retryCount : existingJob.retryCount,
          errorMessage: errorMessage || existingJob.errorMessage,
        });
      }
      return newMap;
    });
  };

  // 移除任務
  const removeJob = (jobId: string) => {
    setActiveJobs((prev) => {
      const newMap = new Map(prev);
      newMap.delete(jobId);
      return newMap;
    });
  };

  // 獲取任務狀態顯示文本
  const getStatusText = (job: JobDetails) => {
    const {
      status,
      progress,
      currentStep,
      estimatedTimeRemaining,
      retryCount,
    } = job;

    switch (status) {
      case "queued":
        return "排隊中...";
      case "processing":
        if (currentStep) {
          return `${currentStep}${
            progress !== undefined ? ` (${progress}%)` : ""
          }`;
        }
        return `轉檔處理中...${
          progress !== undefined ? ` (${progress}%)` : ""
        }`;
      case "completed":
        return "轉檔完成！";
      case "failed":
        return "轉檔失敗";
      case "retrying":
        return `重試中... (${retryCount}/5)`;
      case "cancelled":
        return "已取消";
      default:
        return "未知狀態";
    }
  };

  // 獲取狀態圖示
  const getStatusIcon = (status: ConversionJobStatus) => {
    switch (status) {
      case "queued":
        return <Clock size={14} className="text-blue-500" />;
      case "processing":
        return <Loader2 size={14} className="text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle size={14} className="text-green-500" />;
      case "failed":
        return <XCircle size={14} className="text-red-500" />;
      case "retrying":
        return <RefreshCw size={14} className="text-orange-500 animate-spin" />;
      case "cancelled":
        return <AlertCircle size={14} className="text-gray-500" />;
      default:
        return <AlertCircle size={14} className="text-gray-500" />;
    }
  };

  // 格式化時間顯示
  const formatTimeRemaining = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return "剛剛";

    if (seconds < 60) {
      return `約 ${Math.ceil(seconds)} 秒`;
    } else if (seconds < 3600) {
      return `約 ${Math.ceil(seconds / 60)} 分鐘`;
    } else {
      return `約 ${Math.ceil(seconds / 3600)} 小時`;
    }
  };

  // 進度條組件
  const ProgressBar = ({ progress }: { progress?: number }) => {
    if (progress === undefined) return null;

    return (
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    );
  };

  // 修改 handleConfirmConversion 函數以包含新的任務詳細信息
  const handleConfirmConversion = async () => {
    if (!preview) return;

    setConversionLoading(true);

    try {
      const requestData: ConvertNovelDto = {
        novelId: preview.novelId,
        includeCover: true,
      };

      const response = await apiClient.conversions.create(requestData);

      if (!response.success || !response.data?.jobId) {
        throw new Error(response.message || "轉檔請求失敗");
      }

      const jobId = response.data.jobId;

      // 創建新的任務詳細信息
      const newJob: JobDetails = {
        status: "queued",
        title: preview.title,
        source: preview.source,
        startTime: new Date(),
        lastUpdated: new Date(),
        retryCount: 0,
      };

      // 添加到活動任務列表
      setActiveJobs((prev) => {
        const newMap = new Map(prev);
        newMap.set(jobId, newJob);
        return newMap;
      });

      // 開始輪詢任務狀態
      setTimeout(
        () => pollJobStatus(jobId, preview.title, preview.source),
        2000
      );

      toast.success("轉檔任務已開始", {
        description: `正在處理：${preview.title}`,
      });

      // 關閉預覽
      handleClosePreview();
    } catch (error: any) {
      console.error("轉檔請求失敗:", error);

      let errorMessage = "轉檔請求失敗";

      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        errorMessage = "轉檔請求超時，請稍後再試";
      } else if (
        error.message.includes("Network Error") ||
        error.code === "ERR_NETWORK"
      ) {
        errorMessage = "網路連線失敗，請檢查網路連線";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "請求參數錯誤";
      } else if (error.response?.status === 401) {
        errorMessage = "請先登入後再進行轉檔";
      } else if (error.response?.status === 429) {
        errorMessage = "請求過於頻繁，請稍後再試";
      } else if (error.response?.status >= 500) {
        errorMessage = "伺服器暫時無法處理請求，請稍後再試";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setConversionLoading(false);
    }
  };

  // 關閉預覽
  const handleClosePreview = () => {
    setShowPreview(false);
    setPreview(null);
    setError("");
    // 🆕 關閉預覽時清理輪詢
    clearPreviewPolling();
  };

  // 切換狀態欄收合/展開
  const toggleStatusBar = () => {
    setStatusBarCollapsed(!statusBarCollapsed);
  };

  // 處理Send to Kindle (供RecentTasksModal使用) - 直接發送，不顯示確認對話框
  const handleSendToKindleFromModal = async (jobId: string) => {
    if (!isAuthenticated) {
      toast.error("請先登入以使用Send to Kindle功能", {
        description: "需要登入",
      });
      return;
    }

    if (!user?.kindleEmail) {
      toast.error("請先設定 Kindle 電子郵件", {
        description: "請到會員中心設定您的 Kindle 郵箱",
      });
      return;
    }

    try {
      toast.info("正在發送到 Kindle...", {
        description: "請稍候",
      });

      const requestData: SendToKindleDto = {
        jobId: jobId,
        kindleEmail: user.kindleEmail,
      };

      const response = await apiClient.kindle.send(requestData);

      if (response.success) {
        toast.success("EPUB 已加入 Kindle 發送隊列", {
          description: "請稍後查看您的 Kindle 設備",
        });
      } else {
        throw new Error(response.message || "發送失敗");
      }
    } catch (error: any) {
      console.error("發送到 Kindle 失敗:", error);
      const errorMessage = error.message || "發送到 Kindle 時發生錯誤";
      toast.error(errorMessage, {
        description: "發送失敗",
      });
    }
  };

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      }
    >
      <Layout>
        {/* Hero Section */}
        <section className="relative min-h-[80vh] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 overflow-hidden">
          {/* 背景裝飾元素 */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300/10 rounded-full blur-2xl"></div>

            {/* 新增的浮動幾何裝飾 */}
            <div className="absolute top-32 right-32 w-16 h-16 bg-white/20 rounded-lg rotate-45 animate-pulse"></div>
            <div className="absolute bottom-32 left-32 w-12 h-12 bg-yellow-300/30 rounded-full animate-bounce"></div>
            <div className="absolute top-48 left-1/4 w-8 h-8 bg-pink-300/40 rotate-12 animate-pulse"></div>

            {/* 星星裝飾 */}
            <div className="absolute top-24 left-1/2 w-3 h-3 bg-white/60 rounded-full animate-twinkle"></div>
            <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-yellow-300/80 rounded-full animate-twinkle animation-delay-1000"></div>
            <div className="absolute bottom-1/3 left-1/6 w-2 h-2 bg-white/50 rounded-full animate-twinkle animation-delay-2000"></div>

            {/* 浮動的線條裝飾 */}
            <div className="absolute top-1/4 right-1/5 w-32 h-0.5 bg-white/30 rotate-12 animate-pulse"></div>
            <div className="absolute bottom-1/4 left-1/8 w-24 h-0.5 bg-yellow-300/50 -rotate-12 animate-pulse animation-delay-1500"></div>
          </div>

          <div className="container mx-auto px-4 py-12 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* 主標題區塊 */}
              <div className="mb-8">
                <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white leading-tight">
                  將小說轉換為
                  <span className="block bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent">
                    EPUB 電子書
                  </span>
                </h1>
                <p className="text-xl md:text-2xl mb-6 text-white/90 max-w-3xl mx-auto leading-relaxed">
                  支援小説家になろう和カクヨム網站，一鍵轉換下載 EPUB，支援
                  Kindle 轉寄
                </p>
              </div>

              {/* URL Input Section */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20 max-w-2xl mx-auto">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    開始轉換
                  </h3>
                  <p className="text-gray-600">輸入小說網址或作品 ID</p>
                </div>

                <div className="flex flex-col gap-4">
                  <Input
                    placeholder="例如：https://ncode.syosetu.com/n1234ab/ 或 n1234ab"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full h-14 bg-white border-2 border-gray-200 focus:border-sky-400 text-lg px-6 rounded-xl transition-all duration-200 placeholder:text-gray-400"
                  />

                  <Button
                    onClick={handleDownload}
                    disabled={isLoading || !source || !sourceId}
                    className="w-full h-14 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        處理中...
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Eye className="w-5 h-5" />
                        獲取預覽
                      </div>
                    )}
                  </Button>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 font-medium">{error}</p>
                  </div>
                )}

                {source && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-green-700 font-medium flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      已檢測到站點：
                      {source === NOVEL_SITES.NAROU
                        ? "小說家になろう"
                        : "カクヨム"}
                    </p>
                  </div>
                )}

                {isLoading && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3 text-blue-700">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="font-medium">
                        {previewStatus === "processing"
                          ? "正在爬取小說資料，請稍候..."
                          : previewStatus === "queued"
                          ? "正在等待處理，請稍候..."
                          : "正在處理您的請求，請稍候..."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 底部現代化裝飾 */}
          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white/20 to-transparent"></div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-1 bg-white/30 rounded-full"></div>
              <div className="w-3 h-3 bg-white/40 rounded-full animate-pulse"></div>
              <div className="w-8 h-1 bg-white/30 rounded-full"></div>
              <div
                className="w-2 h-2 bg-white/50 rounded-full animate-pulse"
                style={{ animationDelay: "0.5s" }}
              ></div>
              <div className="w-16 h-1 bg-white/30 rounded-full"></div>
            </div>
          </div>
        </section>

        {/* 小說預覽彈出元件 - 使用 Portal 確保相對於 viewport 定位 */}
        {showPreview && preview && (
          <Portal>
            <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-md transition-all duration-300">
              <div
                className={`fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden border border-white/20 ${previewColor.glowEffect} transform transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in-0 zoom-in-95 z-50`}
              >
                <div className="flex flex-col h-full">
                  {/* 標題欄 */}
                  <div
                    className={`bg-gradient-to-r ${previewColor.gradient} text-white p-6 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="relative flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <h2 className="text-2xl font-bold leading-tight mb-2">
                          {preview.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                            {preview.author}
                          </span>
                          <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                            {preview.source === NOVEL_SITES.NAROU
                              ? "小說家になろう"
                              : "カクヨム"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleClosePreview}
                        className="text-white/80 hover:text-white transition-colors duration-200 p-2 hover:bg-white/10 rounded-full flex-shrink-0"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>

                  {/* 內容區域 */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6">
                      <h3
                        className={`text-lg font-bold mb-3 ${previewColor.textLight} flex items-center gap-2`}
                      >
                        <div
                          className={`w-1 h-6 ${previewColor.bg} rounded-full`}
                        ></div>
                        簡介
                      </h3>
                      <div
                        className={`text-gray-700 whitespace-pre-line ${previewColor.bgLight}/50 p-4 rounded-xl border border-gray-200/60 leading-relaxed max-h-64 overflow-y-auto preview-description-scroll`}
                      >
                        {preview.description}
                      </div>
                    </div>
                  </div>

                  {/* 底部操作欄 */}
                  <div className="border-t border-gray-200/60 p-6 bg-gray-50/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        點擊「確認轉換」開始處理此小說
                      </div>
                      <Button
                        onClick={handleConfirmConversion}
                        disabled={conversionLoading}
                        className={`px-6 py-3 text-white bg-gradient-to-r ${previewColor.gradient} font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none`}
                      >
                        {conversionLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            處理中...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <DownloadCloud size={18} />
                            確認轉換
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Features Section */}
        <section className="relative py-20 px-4 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 overflow-hidden">
          {/* 背景裝飾 */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-10 right-10 w-64 h-64 bg-gradient-to-br from-sky-200 to-blue-300 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-10 w-48 h-48 bg-gradient-to-br from-indigo-200 to-purple-300 rounded-full blur-2xl"></div>
            <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-br from-emerald-200 to-teal-300 rounded-full blur-xl transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>

          {/* 新增的幾何裝飾元素 */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-32 right-1/4 w-16 h-16 bg-sky-300/40 rounded-lg rotate-45 animate-pulse"></div>
            <div className="absolute bottom-32 left-1/4 w-12 h-12 bg-blue-300/50 rounded-full animate-bounce"></div>
            <div className="absolute top-1/3 right-1/3 w-8 h-8 bg-indigo-300/60 rotate-12 animate-pulse"></div>
          </div>

          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 text-sky-700 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
                為什麼選擇我們
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                專業的 Syosetu2EPUB 服務
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                專業的小說轉換工具，讓您輕鬆享受數位閱讀體驗，支援多種平台
              </p>
              <div className="mt-8 flex justify-center">
                <div className="h-1 w-32 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 rounded-full"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className={`group relative overflow-hidden border-2 ${feature.border} hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 bg-white/90 backdrop-blur-sm`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-all duration-500`}
                  ></div>

                  <CardHeader className="pb-4 relative z-10">
                    <div
                      className={`w-20 h-20 rounded-3xl ${feature.bgLight} flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                    >
                      <span className="text-4xl">{feature.icon}</span>
                    </div>
                    <CardTitle
                      className={`text-xl font-bold text-center ${feature.color} group-hover:text-opacity-90 transition-colors duration-300`}
                    >
                      {feature.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="text-center relative z-10 pb-6">
                    <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </CardContent>

                  {/* 裝飾性元素 */}
                  <div className="absolute top-4 right-4 w-8 h-8 border-2 border-gray-200 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-2 border-gray-200 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>

                  {/* 數字標籤 */}
                  <div
                    className={`absolute top-6 left-6 w-8 h-8 rounded-full ${feature.bgLight} ${feature.color} flex items-center justify-center text-sm font-bold opacity-60 group-hover:opacity-80 transition-opacity duration-300`}
                  >
                    {index + 1}
                  </div>
                </Card>
              ))}
            </div>

            {/* 統計數據區塊 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-gray-200 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="space-y-2">
                  <div className="text-4xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                    1000+
                  </div>
                  <div className="text-gray-600 font-medium">
                    成功轉換的小說
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                    500+
                  </div>
                  <div className="text-gray-600 font-medium">滿意的用戶</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-text text-transparent">
                    99.9%
                  </div>
                  <div className="text-gray-600 font-medium">系統穩定性</div>
                </div>
              </div>
            </div>

            {/* 底部裝飾線 */}
            <div className="mt-16 flex justify-center">
              <div className="h-px w-64 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {!isAuthenticated && (
          <section className="bg-gradient-to-br from-gray-50 to-white py-16 border-t border-gray-200">
            <div className="container mx-auto px-4 text-center max-w-4xl">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200">
                <h2 className="text-3xl font-bold mb-6 text-gray-800 bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                  開始使用 Syosetu2EPUB
                </h2>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                  註冊會員即可享有完整的轉換服務，包括 Kindle
                  轉寄、任務歷史查詢、優先處理等功能
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    variant="default"
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <Link to="/how-to-use">使用教學</Link>
                  </Button>
                  <Button
                    onClick={handleLogin}
                    variant="outline"
                    className="border-2 border-sky-500 text-sky-600 hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 px-8 py-3 rounded-xl transition-all duration-200 hover:border-sky-600"
                  >
                    註冊/登入
                  </Button>
                </div>

                <div className="mt-8 flex justify-center items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>立即註冊</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>即時轉換</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span>安全可靠</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Welcome Section for Authenticated Users */}
        {isAuthenticated && (
          <section className="relative py-16 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border-t border-gray-200 overflow-hidden">
            {/* 背景裝飾 */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-sky-300 to-blue-400 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-300 to-purple-400 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 text-sky-700 rounded-full text-sm font-medium mb-6">
                  <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                  已登入會員
                </div>

                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
                  歡迎回來，
                  <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                    {user?.displayName || "會員"}
                  </span>
                  ！
                </h2>

                <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                  您已經是我們的會員，可以享受完整的轉換服務。查看您的轉換記錄或管理您的帳戶設定。
                </p>

                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <Button
                    onClick={() => setIsRecentTasksModalOpen(true)}
                    variant="default"
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    aria-label="查看最近的轉換任務"
                  >
                    <History className="mr-3 h-5 w-5" />
                    <span className="text-lg font-semibold">最近的任務</span>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-2 border-sky-500 text-sky-600 hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 px-8 py-4 rounded-xl transition-all duration-200 hover:border-sky-600 hover:shadow-lg"
                  >
                    <Link to="/me">
                      <span className="text-lg font-semibold">會員中心</span>
                    </Link>
                  </Button>
                </div>

                {/* 功能快捷入口 */}
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <Send className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">
                      Kindle 轉寄
                    </h3>
                    <p className="text-sm text-gray-600">
                      直接發送到您的 Kindle 設備
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">快速下載</h3>
                    <p className="text-sm text-gray-600">
                      一鍵下載 EPUB 格式電子書
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">任務追蹤</h3>
                    <p className="text-sm text-gray-600">即時監控轉換進度</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="bg-white py-8 border-t border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-600 text-sm">
                © 2024 Syosetu2EPUB. All rights reserved.
              </div>
              <nav className="flex gap-6">
                <Link
                  to="/how-to-use"
                  className="text-gray-600 hover:text-sky-500 text-sm"
                >
                  使用教學
                </Link>
                <Link
                  to="/me"
                  className="text-gray-600 hover:text-sky-500 text-sm"
                >
                  會員中心
                </Link>
                <a
                  href="mailto:support@syosetu2epub.online"
                  className="text-gray-600 hover:text-sky-500 text-sm"
                >
                  聯絡我們
                </a>
              </nav>
            </div>
          </div>
        </footer>

        {/* 任務狀態欄 - 使用 Portal 確保相對於 viewport 定位 */}
        {activeJobs.size > 0 && (
          <Portal>
            <div
              className={`fixed bottom-6 right-6 w-80 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/60 z-50 transition-all duration-300 overflow-hidden ${
                statusBarCollapsed ? "h-16" : "max-h-96"
              }`}
            >
              <div
                className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-4 flex justify-between items-center cursor-pointer rounded-t-2xl"
                onClick={toggleStatusBar}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">轉檔任務</h3>
                    <p className="text-xs text-white/80">
                      {activeJobs.size} 個進行中
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/70">
                    {formatTimeRemaining(
                      Math.floor(
                        (new Date().getTime() - lastSyncTime.getTime()) / 1000
                      )
                    )}{" "}
                    前更新
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatusBar();
                    }}
                    className="text-white hover:text-white/80 transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                  >
                    {statusBarCollapsed ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </button>
                </div>
              </div>
              <div
                className={`overflow-y-auto ${
                  statusBarCollapsed ? "hidden" : "max-h-80"
                }`}
              >
                {Array.from(activeJobs.entries()).map(([jobId, job]) => (
                  <div
                    key={jobId}
                    className="p-4 border-b border-gray-100/60 hover:bg-gradient-to-r hover:from-sky-50/50 hover:to-blue-50/50 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-r from-sky-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          {getStatusIcon(job.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-medium text-sm text-gray-800 truncate"
                            title={job.title}
                          >
                            {job.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            開始：
                            {job.startTime.toLocaleTimeString("zh-TW", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeJob(jobId)}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-3 p-1 rounded-full hover:bg-red-50 transition-all duration-200"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            job.status === "queued" ||
                            job.status === "processing"
                              ? "bg-sky-100 text-sky-700"
                              : job.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : job.status === "retrying"
                              ? "bg-orange-100 text-orange-700"
                              : job.status === "cancelled"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {getStatusText(job)}
                        </span>
                        {job.estimatedTimeRemaining &&
                          job.status === "processing" && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {formatTimeRemaining(job.estimatedTimeRemaining)}
                            </span>
                          )}
                      </div>

                      {/* 進度條 */}
                      <ProgressBar progress={job.progress} />

                      {/* 錯誤信息 */}
                      {job.errorMessage &&
                        (job.status === "failed" ||
                          job.status === "retrying") && (
                          <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              <span className="break-words">
                                {job.errorMessage}
                              </span>
                            </div>
                          </div>
                        )}

                      {/* 操作按鈕 */}
                      {job.status === "completed" && job.publicUrl && (
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => {
                              if (job.publicUrl) {
                                const link = document.createElement("a");
                                link.href = job.publicUrl;
                                link.download = `${job.title || "novel"}.epub`;
                                link.rel = "noopener noreferrer";
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-2 text-xs bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-medium"
                          >
                            <Download size={14} /> 下載檔案
                          </button>
                          {/* 只對已登入且有 kindleEmail 的用戶顯示 Send to Kindle 按鈕 */}
                          {isAuthenticated && user?.kindleEmail && (
                            <SendToKindleButton epubJobId={jobId} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Portal>
        )}

        {/* 最近任務彈窗 */}
        <RecentTasksModal
          isOpen={isRecentTasksModalOpen}
          onOpenChange={setIsRecentTasksModalOpen}
          onSendToKindle={handleSendToKindleFromModal}
        />
      </Layout>
    </Suspense>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { apiClient } from "@/lib/api-client";
import type {
  PreviewNovelDto,
  ConvertNovelDto,
  PreviewResponse,
  ConversionResponse,
  ConversionStatusResponse,
  SendToKindleDto,
  KindleDeliveryResponse,
  NovelPreview,
} from "@/lib/api-client";
import { useAuth } from "@/lib/contexts";
import {
  X,
  DownloadCloud,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  ExternalLink,
  History,
  Send,
  Eye,
  EyeOff,
} from "lucide-react";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { toast } from "sonner";
import {
  handleError,
  validateApiResponse,
  withRetry,
  ErrorType,
} from "@/lib/error-handler";
import { debug } from "@/lib/debug.js";
import SendToKindleButton from "@/components/SendToKindleButton";
import RecentTasksModal from "@/components/RecentTasksModal";

// 功能特點資料
const features = [
  {
    title: "快速轉換",
    description: "只需輸入網址，系統自動爬取並轉換為 EPUB 格式",
    icon: "⚡",
  },
  {
    title: "Kindle 支援",
    description: "支援直接轉寄至 Kindle 信箱，即時同步閱讀",
    icon: "📱",
  },
  {
    title: "批量處理",
    description: "付費會員可享有批量轉換功能，一次處理多部小說",
    icon: "📚",
  },
  {
    title: "安全可靠",
    description: "系統穩定，資料安全，支援任務進度查詢",
    icon: "🔒",
  },
];

// 站點定義
const NOVEL_SITES = {
  NAROU: "narou",
  KAKUYOMU: "kakuyomu",
};

// 站點配色
const SITE_COLORS = {
  [NOVEL_SITES.NAROU]: {
    border: "border-blue-500",
    button: "bg-blue-600 hover:bg-blue-700",
    heading: "text-blue-700",
    accent: "border-blue-400",
  },
  [NOVEL_SITES.KAKUYOMU]: {
    border: "border-orange-500",
    button: "bg-orange-600 hover:bg-orange-700",
    heading: "text-orange-700",
    accent: "border-orange-400",
  },
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

// 轉檔任務響應介面 - 增加進度信息
interface ConversionJobResponse {
  success: boolean;
  jobId?: string;
  status?: ConversionJobStatus;
  publicUrl?: string;
  message?: string;
  progress?: number; // 0-100 的進度百分比
  estimatedTimeRemaining?: number; // 預估剩餘時間（秒）
  currentStep?: string; // 當前處理步驟
}

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
  // 柔和明亮的顏色組合
  const colors = [
    {
      border: "border-teal-500",
      bg: "bg-teal-500",
      text: "text-teal-600",
      hover: "hover:bg-teal-600",
      light: "bg-teal-50",
    },
    {
      border: "border-sky-500",
      bg: "bg-sky-500",
      text: "text-sky-600",
      hover: "hover:bg-sky-600",
      light: "bg-sky-50",
    },
    {
      border: "border-indigo-500",
      bg: "bg-indigo-500",
      text: "text-indigo-600",
      hover: "hover:bg-indigo-600",
      light: "bg-indigo-50",
    },
    {
      border: "border-violet-500",
      bg: "bg-violet-500",
      text: "text-violet-600",
      hover: "hover:bg-violet-600",
      light: "bg-violet-50",
    },
    {
      border: "border-rose-500",
      bg: "bg-rose-500",
      text: "text-rose-600",
      hover: "hover:bg-rose-600",
      light: "bg-rose-50",
    },
    {
      border: "border-emerald-500",
      bg: "bg-emerald-500",
      text: "text-emerald-600",
      hover: "hover:bg-emerald-600",
      light: "bg-emerald-50",
    },
    {
      border: "border-cyan-500",
      bg: "bg-cyan-500",
      text: "text-cyan-600",
      hover: "hover:bg-cyan-600",
      light: "bg-cyan-50",
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
      console.log(`🔄 輪詢預覽任務狀態: ${jobId} (重試次數: ${retryCount})`);
      const response = await apiClient.novels.getPreviewStatus(jobId, {
        skipCache: true,
      });

      console.log("📡 API 原始響應:", response);
      console.log("📊 響應結構分析:", {
        hasSuccess: "success" in response,
        successValue: response.success,
        hasData: "data" in response,
        dataKeys: response.data ? Object.keys(response.data) : "no data",
        dataStatus: response.data?.status,
        dataPreview: response.data?.preview ? "has preview" : "no preview",
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
      console.log("🔍 原始狀態值:", rawStatus, typeof rawStatus);

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
      console.log("📈 狀態轉換:", {
        原始狀態: rawStatus,
        轉換後狀態: status,
        是否有預覽數據: !!response.data?.preview,
      });

      // 根據任務狀態處理
      switch (status) {
        case "completed":
          clearPreviewPolling();
          if (response.data?.preview) {
            console.log("設置預覽數據:", response.data.preview);
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
          console.log(`任務仍在處理中，將在${interval}ms後再次輪詢`);

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
        console.log(
          `預覽輪詢將在${retryDelay}ms後重試 (第${newRetryCount}次重試)`
        );

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

    console.log("驗證輸入內容:", input);

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
      console.log("未檢測到有效的網址或ID");
      setError("請輸入正確的網址或作品 ID");
      setSource("");
      setSourceId("");
      return;
    }

    detectedSource = match.site;
    detectedSourceId = match.id;

    console.log("檢測結果:", { source: detectedSource, id: detectedSourceId });

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
                  window.open(publicUrl, "_blank");
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
    if (!seconds || seconds <= 0) return "";

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

  // 處理Send to Kindle (供RecentTasksModal使用)
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
    <Layout>
      {/* Hero Section */}
      <section className="bg-[url('../public/main-bg.png')] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              將小說轉換為 EPUB 電子書
            </h1>
            <p className="text-lg mb-8 text-white">
              支援成為小説家になろう和カクヨム網站小說，一鍵轉換下載EPUB
            </p>

            {/* URL Input Section */}
            <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <Input
                  placeholder="輸入小說網址或作品 ID..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full sm:w-96 bg-white border-2 border-sky-400"
                />
                <Button
                  onClick={handleDownload}
                  disabled={isLoading || !source || !sourceId}
                  className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white font-medium"
                >
                  {isLoading ? "處理中..." : "獲取預覽"}
                </Button>
              </div>

              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

              {source && (
                <p className="mt-2 text-sm text-green-600">
                  已檢測到站點：
                  {source === NOVEL_SITES.NAROU ? "小說家になろう" : "カクヨム"}
                </p>
              )}

              {isLoading && (
                <div className="mt-4 text-sm text-gray-500">
                  {previewStatus === "processing" ? (
                    <p className="animate-pulse">正在爬取小說資料，請稍候...</p>
                  ) : previewStatus === "queued" ? (
                    <p className="animate-pulse">正在等待處理，請稍候...</p>
                  ) : (
                    <p className="animate-pulse">正在處理您的請求，請稍候...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 小說預覽彈出元件 */}
      {showPreview && preview && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div
            className={`bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden border-l-8 ${previewColor.border}`}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className={`text-2xl font-bold ${previewColor.text}`}>
                  {preview.title}
                </h2>
                <button
                  onClick={handleClosePreview}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 ${previewColor.bg} text-white rounded-full text-sm font-bold`}
                  >
                    {preview.author}
                  </span>
                  <span
                    className={`px-3 py-1 ${
                      preview.source === NOVEL_SITES.NAROU
                        ? "bg-[#18b7cd]"
                        : "bg-[#4baae0]"
                    } text-white rounded-full text-sm font-bold`}
                  >
                    {preview.source === NOVEL_SITES.NAROU
                      ? "小說家になろう"
                      : "カクヨム"}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h3
                  className={`text-lg font-semibold mb-2 pb-1 border-b ${previewColor.border}`}
                >
                  簡介
                </h3>
                <div className="text-gray-700 whitespace-pre-line bg-gray-100 p-4 rounded-md max-h-64 overflow-y-auto">
                  {preview.description}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleConfirmConversion}
                  disabled={conversionLoading}
                  className={`text-white ${previewColor.bg} ${previewColor.hover} font-semibold`}
                >
                  {conversionLoading ? "處理中..." : "確認轉換"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-800">
            為什麼選擇 Syosetu2EPUB
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border border-gray-200 hover:shadow-md transition-shadow bg-white"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-xl">{feature.icon}</span>
                    <span>{feature.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="bg-gray-50 py-12 border-t border-gray-200">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              開始使用 Syosetu2EPUB
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              註冊會員即可享有更多進階功能，包括批量轉換、Kindle 轉寄等服務
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                variant="default"
                className="bg-sky-500 hover:bg-sky-600"
              >
                <Link to="/how-to-use">使用教學</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-sky-500 text-sky-500 hover:bg-sky-50"
              >
                <Link to="/me">註冊/登入</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Welcome Section for Authenticated Users */}
      {isAuthenticated && (
        <section className="bg-gradient-to-r from-sky-50 to-blue-50 py-12 border-t border-gray-200">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              歡迎回來，{user?.displayName || "會員"}！
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              您已經是我們的會員，可以享受完整的轉換服務。查看您的轉換記錄或管理您的帳戶設定。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => setIsRecentTasksModalOpen(true)}
                variant="default"
                className="bg-sky-500 hover:bg-sky-600"
              >
                我的轉換記錄
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-sky-500 text-sky-500 hover:bg-sky-50"
              >
                <Link to="/me">會員中心</Link>
              </Button>
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
                href="mailto:support@example.com"
                className="text-gray-600 hover:text-sky-500 text-sm"
              >
                聯絡我們
              </a>
            </nav>
          </div>
        </div>
      </footer>

      {/* 任務狀態欄 */}
      {activeJobs.size > 0 && (
        <div
          className={`fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-sky-100 z-40 transition-all duration-300 overflow-hidden ${
            statusBarCollapsed ? "h-12" : "max-h-96"
          }`}
        >
          <div
            className="bg-sky-400 text-white p-2 flex justify-between items-center cursor-pointer"
            onClick={toggleStatusBar}
          >
            <h3 className="text-sm font-medium">
              轉檔任務 ({activeJobs.size})
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-75">
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
                className="text-white hover:text-sky-100"
              >
                {statusBarCollapsed ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
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
                className="p-3 border-b border-sky-50 hover:bg-sky-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(job.status)}
                    <div
                      className="truncate font-medium text-sm"
                      style={{ maxWidth: "180px" }}
                      title={job.title}
                    >
                      {job.title}
                    </div>
                  </div>
                  <button
                    onClick={() => removeJob(jobId)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-medium ${
                        job.status === "queued" || job.status === "processing"
                          ? "text-sky-600"
                          : job.status === "completed"
                          ? "text-green-600"
                          : job.status === "retrying"
                          ? "text-orange-600"
                          : job.status === "cancelled"
                          ? "text-gray-600"
                          : "text-red-600"
                      }`}
                    >
                      {getStatusText(job)}
                    </span>
                    {job.estimatedTimeRemaining &&
                      job.status === "processing" && (
                        <span className="text-xs text-gray-500">
                          {formatTimeRemaining(job.estimatedTimeRemaining)}
                        </span>
                      )}
                  </div>

                  {/* 進度條 */}
                  <ProgressBar progress={job.progress} />

                  {/* 錯誤信息 */}
                  {job.errorMessage &&
                    (job.status === "failed" || job.status === "retrying") && (
                      <div className="text-xs text-red-500 bg-red-50 p-1 rounded mt-1">
                        {job.errorMessage}
                      </div>
                    )}

                  {/* 操作按鈕 */}
                  {job.status === "completed" && job.publicUrl && (
                    <div className="flex items-center gap-1 mt-2">
                      <a
                        href={job.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs bg-sky-500 hover:bg-sky-600 text-white px-2 py-1 rounded-full transition-colors"
                      >
                        <Download size={12} /> 下載
                      </a>
                      {/* 只對已登入且有 kindleEmail 的用戶顯示 Send to Kindle 按鈕 */}
                      {isAuthenticated && user?.kindleEmail && (
                        <SendToKindleButton epubJobId={jobId} />
                      )}
                    </div>
                  )}

                  {/* 任務時間信息 */}
                  <div className="text-xs text-gray-400 mt-1">
                    開始時間：{job.startTime.toLocaleTimeString()}
                    {job.lastUpdated.getTime() !== job.startTime.getTime() && (
                      <span className="ml-2">
                        更新：{job.lastUpdated.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近任務彈窗 */}
      <RecentTasksModal
        isOpen={isRecentTasksModalOpen}
        onOpenChange={setIsRecentTasksModalOpen}
        onSendToKindle={handleSendToKindleFromModal}
      />
    </Layout>
  );
}

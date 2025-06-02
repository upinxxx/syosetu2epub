import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import axios from "@/lib/axios";
import { useAuth } from "@/lib/contexts";
import {
  X,
  DownloadCloud,
  Minimize2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Toast, ToastContainer } from "@/components/ui/toast";
import SendToKindleButton from "@/components/SendToKindleButton";

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

// 預覽小說介面
interface NovelPreview {
  novelId: string;
  title: string;
  author: string;
  description: string;
  source: string;
  sourceId: string;
}

// 預覽任務狀態類型
type PreviewJobStatus = "queued" | "processing" | "completed" | "failed";

// 預覽任務響應介面
interface PreviewJobResponse {
  success: boolean;
  jobId?: string;
  novelId?: string;
  preview?: NovelPreview;
  status?: PreviewJobStatus;
  message?: string;
}

// 轉檔任務狀態類型
type ConversionJobStatus = "queued" | "processing" | "completed" | "failed";

// 轉檔任務響應介面
interface ConversionJobResponse {
  success: boolean;
  jobId?: string;
  status?: ConversionJobStatus;
  publicUrl?: string;
  message?: string;
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
  const [activeJobs, setActiveJobs] = useState<
    Map<
      string,
      {
        status: ConversionJobStatus;
        title: string;
        source: string;
        publicUrl?: string;
      }
    >
  >(new Map());
  const [previewColor, setPreviewColor] = useState(getRandomSoftColor());
  const [statusBarCollapsed, setStatusBarCollapsed] = useState(false);

  // 組件掛載時設置一個隨機顏色
  useEffect(() => {
    setPreviewColor(getRandomSoftColor());
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
      setError("請輸入正確的網址或作品 ID");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      console.log("發送請求獲取預覽:", { source, sourceId });

      // 確保請求數據格式正確
      const requestData = {
        source,
        sourceId,
      };

      // 提交預覽請求
      const response = await axios.post<PreviewJobResponse>(
        "/novels/preview",
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      console.log("預覽響應:", response.data);

      if (!response.data.success) {
        setError(response.data.message || "獲取小說預覽失敗");
        setIsLoading(false);
        return;
      }

      // 如果後端直接返回預覽數據（同步模式）
      if (response.data.preview) {
        console.log("設置預覽數據:", response.data.preview);
        // 每次顯示預覽時重新生成隨機顏色
        setPreviewColor(getRandomSoftColor());
        setPreview(response.data.preview);
        setShowPreview(true);
        setIsLoading(false);
        return;
      }

      // 如果後端返回任務ID（非同步模式）
      if (response.data.jobId) {
        setPreviewJobId(response.data.jobId);
        setPreviewStatus("queued");
        // 開始輪詢任務狀態
        pollPreviewJob(response.data.jobId);
      } else if (response.data.novelId) {
        console.log("後端返回了novelId，但沒有jobId，將直接獲取預覽數據");
        try {
          const previewResponse = await axios.get<PreviewJobResponse>(
            `/novels/preview/${response.data.novelId}`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          );

          if (previewResponse.data.success && previewResponse.data.preview) {
            console.log("成功獲取預覽數據:", previewResponse.data.preview);
            setPreviewColor(getRandomSoftColor());
            setPreview(previewResponse.data.preview);
            setShowPreview(true);
          } else {
            setError("無法獲取小說預覽詳情");
          }
        } catch (previewError: any) {
          console.error("獲取預覽詳情失敗:", previewError);

          // 嘗試使用最小化的資訊創建預覽
          // 即使無法獲取完整預覽，也可以展示基本資訊並允許用戶繼續
          try {
            const minimalPreview: NovelPreview = {
              novelId: response.data.novelId,
              title: `${
                source === "narou" ? "小說家になろう" : "カクヨム"
              }小說`,
              author: "作者資訊獲取失敗",
              description: "無法獲取完整小說資訊，但您仍可繼續轉換流程。",
              source: source,
              sourceId: sourceId,
            };

            setPreviewColor(getRandomSoftColor());
            setPreview(minimalPreview);
            setShowPreview(true);
            console.log("已創建最小化預覽:", minimalPreview);
          } catch (e) {
            setError("獲取小說預覽詳情失敗");
          }
        }
        setIsLoading(false);
      } else {
        setError("獲取預覽任務 ID 失敗");
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("獲取預覽失敗:", error);

      // 更詳細的錯誤診斷
      if (error.message.includes("Network Error")) {
        console.error("網絡連接失敗，可能是後端服務未啟動或CORS問題");
        setError("無法連接到伺服器，請確認伺服器是否啟動");
      } else {
        // 顯示更詳細的錯誤信息
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "獲取預覽過程發生錯誤，請稍後再試";
        setError(errorMessage);
      }

      setIsLoading(false);
    }
  };

  // 輪詢預覽任務狀態
  const pollPreviewJob = async (jobId: string) => {
    try {
      console.log("輪詢預覽任務狀態:", jobId);
      const response = await axios.get<PreviewJobResponse>(
        `/novels/preview-status/${jobId}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      console.log("預覽狀態響應:", response.data);

      if (!response.data.success) {
        setError(response.data.message || "檢查預覽狀態失敗");
        setIsLoading(false);
        return;
      }

      // 獲取狀態並轉換為前端使用的狀態類型
      let status: PreviewJobStatus;

      // 將後端返回的狀態映射到前端狀態
      switch (String(response.data.status)) {
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
          console.warn(
            `未知的任務狀態: ${response.data.status}，默認為 queued`
          );
          status = "queued";
      }

      setPreviewStatus(status);
      console.log("預覽任務狀態(原始):", response.data.status);
      console.log("預覽任務狀態(轉換後):", status);

      // 根據任務狀態處理
      switch (status) {
        case "completed":
          if (response.data.preview) {
            console.log("設置預覽數據:", response.data.preview);
            // 每次顯示預覽時重新生成隨機顏色
            setPreviewColor(getRandomSoftColor());
            setPreview(response.data.preview);
            setShowPreview(true);
          } else {
            console.error("預覽數據不完整");
            setError("預覽數據不完整");
          }
          setIsLoading(false);
          break;

        case "failed":
          setError(response.data.message || "獲取預覽失敗");
          setIsLoading(false);
          break;

        case "processing":
        case "queued":
          // 繼續輪詢，設置延遲以避免過於頻繁的請求
          console.log("任務仍在處理中，將在2秒後再次輪詢");
          setTimeout(() => pollPreviewJob(jobId), 2000);
          break;

        default:
          setError("未知的預覽任務狀態");
          setIsLoading(false);
      }
    } catch (error: any) {
      console.error("輪詢預覽任務失敗:", error);

      // 更詳細的錯誤診斷
      if (error.message.includes("Network Error")) {
        console.error("網絡連接失敗，可能是後端服務未啟動或CORS問題");
        setError("無法連接到伺服器，請確認伺服器是否啟動");
      } else {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "檢查預覽狀態時發生錯誤";
        setError(errorMessage);
      }

      setIsLoading(false);
    }
  };

  // 處理確認轉換
  const handleConfirmConversion = async () => {
    if (!preview) return;

    setConversionLoading(true);
    try {
      // 提交轉檔請求
      const response = await axios.post<ConversionJobResponse>(
        "/novels/convert",
        {
          novelId: preview.novelId,
        }
      );

      if (!response.data.jobId) {
        setError("提交轉檔任務失敗");
        setConversionLoading(false);
        return;
      }

      // 關閉預覽視窗
      setShowPreview(false);
      setConversionLoading(false);

      // 添加到活動任務列表
      if (response.data.jobId && preview) {
        const jobId = response.data.jobId;
        setActiveJobs((prev) => {
          const newMap = new Map(prev);
          newMap.set(jobId, {
            status: "queued",
            title: preview.title,
            source: preview.source,
          });
          return newMap;
        });

        // 開始輪詢任務狀態
        pollJobStatus(jobId, preview.title, preview.source);
      }
    } catch (error) {
      console.error("提交轉檔任務失敗:", error);
      setConversionLoading(false);
      setError("提交轉檔過程發生錯誤，請稍後再試");
    }
  };

  // 輪詢任務狀態
  const pollJobStatus = async (
    jobId: string,
    title: string,
    source: string
  ) => {
    try {
      const response = await axios.get<ConversionJobResponse>(
        `/novels/convert/${jobId}/status`
      );

      if (!response.data.success) {
        updateJobStatus(jobId, "failed", response.data.message);
        return;
      }

      // 將後端返回的狀態映射到前端狀態
      let status: ConversionJobStatus;

      switch (String(response.data.status)) {
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
          console.warn(
            `未知的轉檔任務狀態: ${response.data.status}，默認為 failed`
          );
          status = "failed";
      }

      console.log(`轉檔任務 ${jobId} 狀態(原始): ${response.data.status}`);
      console.log(`轉檔任務 ${jobId} 狀態(轉換後): ${status}`);

      const publicUrl = response.data.publicUrl;

      // 更新任務狀態
      updateJobStatus(jobId, status, undefined, publicUrl);

      // 根據任務狀態處理
      switch (status) {
        case "completed":
          // 任務完成，停止輪詢
          break;

        case "failed":
          // 任務失敗，停止輪詢
          break;

        case "queued":
        case "processing":
          // 繼續輪詢，設置延遲
          setTimeout(() => pollJobStatus(jobId, title, source), 4000);
          break;

        default:
          updateJobStatus(jobId, "failed", "未知的任務狀態");
      }
    } catch (error) {
      console.error("輪詢任務狀態失敗:", error);
      updateJobStatus(jobId, "failed", "檢查任務狀態時發生錯誤");
    }
  };

  // 更新任務狀態
  const updateJobStatus = (
    jobId: string,
    status: ConversionJobStatus,
    errorMessage?: string,
    publicUrl?: string
  ) => {
    setActiveJobs((prev) => {
      const newMap = new Map(prev);
      const job = newMap.get(jobId);
      if (job) {
        newMap.set(jobId, {
          ...job,
          status,
          publicUrl,
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
  const getStatusText = (status: ConversionJobStatus) => {
    switch (status) {
      case "queued":
        return "排隊中...";
      case "processing":
        return "轉檔處理中...";
      case "completed":
        return "轉檔完成！";
      case "failed":
        return "轉檔失敗";
      default:
        return "未知狀態";
    }
  };

  // 獲取任務 Toast 變體
  const getStatusVariant = (status: ConversionJobStatus) => {
    switch (status) {
      case "queued":
        return "info";
      case "processing":
        return "info";
      case "completed":
        return "success";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  // 關閉預覽
  const handleClosePreview = () => {
    setShowPreview(false);
    setPreview(null);
  };

  // 切換狀態欄收合/展開
  const toggleStatusBar = () => {
    setStatusBarCollapsed(!statusBarCollapsed);
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
                asChild
                variant="default"
                className="bg-sky-500 hover:bg-sky-600"
              >
                <Link to="/orders">我的轉換記錄</Link>
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
          className={`fixed bottom-4 right-4 w-72 bg-white rounded-lg shadow-lg border border-sky-100 z-40 transition-all duration-300 overflow-hidden ${
            statusBarCollapsed ? "h-12" : "max-h-80"
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
              statusBarCollapsed ? "hidden" : "max-h-72"
            }`}
          >
            {Array.from(activeJobs.entries()).map(([jobId, job]) => (
              <div
                key={jobId}
                className="p-3 border-b border-sky-50 hover:bg-sky-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div
                    className="truncate font-medium text-sm mr-2"
                    style={{ maxWidth: "160px" }}
                  >
                    {job.title}
                  </div>
                  <button
                    onClick={() => removeJob(jobId)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span
                    className={`text-xs ${
                      job.status === "queued" || job.status === "processing"
                        ? "text-sky-500"
                        : job.status === "completed"
                        ? "text-green-500"
                        : "text-rose-500"
                    }`}
                  >
                    {getStatusText(job.status)}
                  </span>
                  {job.status === "completed" && job.publicUrl && (
                    <div className="flex items-center gap-1">
                      <a
                        href={job.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs bg-sky-500 hover:bg-sky-600 text-white px-2 py-1 rounded-full transition-colors"
                      >
                        <DownloadCloud size={12} /> 下載
                      </a>
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
      )}
    </Layout>
  );
}

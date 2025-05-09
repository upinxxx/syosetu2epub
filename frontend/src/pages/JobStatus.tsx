import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";

// 任務狀態類型
type JobStatus = "pending" | "processing" | "completed" | "failed";

// 任務詳情介面
interface JobDetail {
  id: string;
  title: string;
  status: JobStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
  downloadUrl?: string;
}

export default function JobStatus() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 實作 API 呼叫獲取任務狀態
    const fetchJobStatus = async () => {
      try {
        // const response = await axios.get(`/api/jobs/${jobId}`);
        // setJob(response.data);
        // 模擬 API 回應
        setJob({
          id: jobId || "",
          title: "範例小說標題",
          status: "processing",
          progress: 45,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("獲取任務狀態失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobStatus();
    // 每 5 秒更新一次狀態
    const interval = setInterval(fetchJobStatus, 5000);
    return () => clearInterval(interval);
  }, [jobId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">載入中...</p>
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-500">找不到任務</p>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      case "processing":
        return "text-blue-600";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = (status: JobStatus) => {
    switch (status) {
      case "completed":
        return "已完成";
      case "failed":
        return "失敗";
      case "processing":
        return "處理中";
      default:
        return "等待中";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link to="/" className="text-blue-600 hover:underline text-sm">
              首頁
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">任務詳情</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{job.title}</h1>
          <p className="text-gray-500 text-sm">任務 ID: {job.id}</p>
        </div>

        {/* 任務狀態卡片 */}
        <Card className="mb-6 bg-white border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-800">任務狀態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">狀態</span>
                <span className={getStatusColor(job.status)}>
                  {getStatusText(job.status)}
                </span>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">轉換進度</span>
                  <span className="text-sm font-medium">{job.progress}%</span>
                </div>
                <Progress value={job.progress} className="h-2 bg-gray-200" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-gray-500 mb-1">建立時間</span>
                  <p>{new Date(job.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">最後更新</span>
                  <p>{new Date(job.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              {job.error && (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-red-600 text-sm">{job.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 相關小說資訊 */}
        <Card className="mb-6 bg-white border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-800">小說資訊</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-gray-500 mb-1">作者</span>
                  <p>範例作者</p>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">章節數</span>
                  <p>150</p>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">字數</span>
                  <p>約 450,000 字</p>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">來源</span>
                  <p>syosetu.com</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作按鈕 */}
        <div className="flex gap-4">
          {job.status === "completed" && job.downloadUrl && (
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
              下載 EPUB
            </Button>
          )}
          {job.status === "failed" && (
            <Button
              variant="outline"
              className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              重試轉換
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            asChild
          >
            <Link to="/me">返回列表</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}

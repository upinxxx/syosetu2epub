import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";

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

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 處理下載請求
  const handleDownload = async () => {
    if (!url) {
      alert("請輸入小說網址");
      return;
    }
    setIsLoading(true);
    try {
      // TODO: 實作 API 呼叫
      // const response = await axios.post('/api/convert', { url });
      setTimeout(() => {
        setIsLoading(false);
        alert("已送出轉檔任務！");
      }, 2000);
    } catch (error) {
      console.error("轉換失敗:", error);
      setIsLoading(false);
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
              支援成為小說家吧（syosetu）網站，一鍵轉換下載
            </p>

            {/* URL Input Section */}
            <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <Input
                  placeholder="輸入小說網址..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full sm:w-96 bg-white border-gray-300"
                />
                <Button
                  onClick={handleDownload}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? "處理中..." : "開始轉換"}
                </Button>
              </div>
              {isLoading && (
                <p className="mt-4 text-sm text-gray-500 animate-pulse">
                  正在處理您的請求，請稍候...
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

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

      {/* Recent Novels Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-gray-800">
            最近轉換的小說
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="border border-gray-200 rounded-md overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">
                    範例小說標題 {item}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    這是一個範例小說描述，實際內容將從資料庫取得。這裡會顯示小說的簡短摘要或描述。
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">2分鐘前</span>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/jobs/${item}`}>查看詳情</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Link to="/how-to-use">使用教學</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Link to="/me">註冊/登入</Link>
            </Button>
          </div>
        </div>
      </section>

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
                className="text-gray-600 hover:text-blue-600 text-sm"
              >
                使用教學
              </Link>
              <Link
                to="/me"
                className="text-gray-600 hover:text-blue-600 text-sm"
              >
                會員中心
              </Link>
              <a
                href="mailto:support@example.com"
                className="text-gray-600 hover:text-blue-600 text-sm"
              >
                聯絡我們
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </Layout>
  );
}

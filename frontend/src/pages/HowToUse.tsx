import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";

// 使用步驟資料
const steps = [
  {
    title: "複製小說網址",
    description:
      "前往「成為小說家吧」網站，找到想要下載的小說頁面，複製網址。支援單話或整本小說網址。",
    icon: "🔗",
  },
  {
    title: "貼上並轉換",
    description:
      "將複製的網址貼到首頁的輸入框中，點擊「開始轉換」按鈕。系統會自動開始處理您的請求。",
    icon: "📥",
  },
  {
    title: "等待處理",
    description:
      "系統會自動爬取小說內容並轉換為 EPUB 格式。轉換時間依小說長度而定，通常在幾秒到幾分鐘內完成。",
    icon: "⏳",
  },
  {
    title: "下載或轉寄",
    description:
      "轉換完成後，您可以直接下載 EPUB 檔案，或使用 Kindle 轉寄功能將檔案發送到您的 Kindle 設備。",
    icon: "📚",
  },
];

// 常見問題資料
const faqs = [
  {
    question: "支援哪些小說網站？",
    answer:
      "目前僅支援「成為小說家吧」(syosetu.com) 網站。未來將逐步增加對其他小說網站的支援。",
  },
  {
    question: "如何設定 Kindle 轉寄？",
    answer:
      "在會員中心的「設定」頁面中，您可以綁定您的 Kindle 電子郵件地址。設定完成後，轉換時可選擇直接轉寄到 Kindle。",
  },
  {
    question: "免費用戶有使用限制嗎？",
    answer:
      "免費用戶每日可轉換 5 次。付費會員享有無限次數轉換、批量處理、自動轉寄等進階功能。",
  },
  {
    question: "檔案會保存多久？",
    answer:
      "轉換後的檔案將保存 7 天。建議在轉換完成後儘快下載或轉寄到 Kindle。",
  },
];

export default function HowToUse() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link to="/" className="text-blue-600 hover:underline text-sm">
              首頁
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">使用教學</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">使用教學</h1>
          <p className="text-gray-600 max-w-2xl">
            只需簡單幾個步驟，即可將您喜愛的小說轉換為 EPUB 電子書格式
          </p>
        </div>

        {/* 使用步驟 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">使用步驟</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, index) => (
              <Card
                key={index}
                className="bg-white border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <span className="text-xl">{step.icon}</span>
                    <span className="text-gray-800">
                      {index + 1}. {step.title}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 常見問題 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">常見問題</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="bg-white border border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-gray-800">
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 示範圖片 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">使用示範</h2>
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
              <p className="text-gray-500">示範動畫將顯示在此處</p>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              示範影片：如何使用 Syosetu2EPUB 轉換小說
            </p>
          </div>
        </section>

        {/* 開始使用 CTA */}
        <section>
          <Card className="bg-gray-50 border border-gray-200">
            <CardContent className="pt-6 pb-8">
              <h3 className="text-lg font-semibold mb-4 text-center text-gray-800">
                準備好開始使用了嗎？
              </h3>
              <p className="text-gray-600 mb-6 text-center text-sm">
                立即體驗快速、便利的小說轉換服務
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link to="/">立即轉換</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Link to="/me">註冊會員</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}

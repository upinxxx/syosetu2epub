import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  Globe,
  Download,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Star,
  Zap,
  Shield,
  Gift,
  ChevronRight,
  Play,
  ExternalLink,
} from "lucide-react";

// 使用步驟資料
const steps = [
  {
    title: "複製小說網址",
    description:
      "前往「成為小說家吧」或「カクヨム」網站，找到想要下載的小說頁面，複製網址。支援單話或整本小說網址。",
    icon: Globe,
    color: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-50",
    textColor: "text-blue-600",
    tips: ["支援完整小說網址", "支援單話網址", "支援作品 ID"],
  },
  {
    title: "貼上並轉換",
    description:
      "將複製的網址貼到首頁的輸入框中，點擊「獲取預覽」按鈕。系統會自動檢測並預覽小說資訊。",
    icon: Download,
    color: "from-green-500 to-green-600",
    bgLight: "bg-green-50",
    textColor: "text-green-600",
    tips: ["自動檢測網站", "即時預覽小說", "確認轉換內容"],
  },
  {
    title: "等待處理",
    description:
      "確認預覽資訊後開始轉換。系統會自動爬取小說內容並轉換為 EPUB 格式。轉換時間依小說長度而定。",
    icon: Clock,
    color: "from-orange-500 to-orange-600",
    bgLight: "bg-orange-50",
    textColor: "text-orange-600",
    tips: ["即時進度追蹤", "支援長篇小說", "自動錯誤重試"],
  },
  {
    title: "下載或轉寄",
    description:
      "轉換完成後，您可以直接下載 EPUB 檔案，或使用 Kindle 轉寄功能將檔案發送到您的 Kindle 設備。",
    icon: BookOpen,
    color: "from-purple-500 to-purple-600",
    bgLight: "bg-purple-50",
    textColor: "text-purple-600",
    tips: ["一鍵下載", "Kindle 轉寄", "檔案保存 7 天"],
  },
];

// 常見問題資料
const faqs = [
  {
    question: "支援哪些小說網站？",
    answer:
      "目前支援「成為小說家吧」(syosetu.com) 和「カクヨム」(kakuyomu.jp) 網站。未來將逐步增加對其他小說網站的支援。",
    icon: Globe,
    color: "text-blue-600",
  },
  {
    question: "如何設定 Kindle 轉寄？",
    answer:
      "在會員中心的設定中，您可以綁定您的 Kindle 電子郵件地址。設定完成後，轉換時可選擇直接轉寄到 Kindle。",
    icon: BookOpen,
    color: "text-green-600",
  },
  {
    question: "使用者有使用限制嗎？",
    answer:
      "使用者可以無限制使用基本轉換功能。所有功能都是開放提供，無需付費訂閱。",
    icon: Gift,
    color: "text-purple-600",
  },
  {
    question: "檔案會保存多久？",
    answer:
      "轉換後的檔案將保存 7 天。建議在轉換完成後儘快下載或轉寄到 Kindle。",
    icon: Shield,
    color: "text-orange-600",
  },
];

// 特色功能
const features = [
  {
    title: "快速轉換",
    description: "秒級響應，高效處理",
    icon: Zap,
    gradient: "from-yellow-400 to-orange-500",
  },
  {
    title: "完全開放",
    description: "完整功能，無使用限制",
    icon: Gift,
    gradient: "from-green-400 to-blue-500",
  },
  {
    title: "安全可靠",
    description: "資料安全，隱私保護",
    icon: Shield,
    gradient: "from-blue-400 to-purple-500",
  },
  {
    title: "支援最新格式",
    description: "EPUB3 格式，支援所有設備",
    icon: BookOpen,
    gradient: "from-purple-400 to-pink-500",
  },
];

export default function HowToUse() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 overflow-hidden">
        {/* 背景裝飾 */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-48 h-48 bg-purple-300/20 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-yellow-300/20 rounded-full blur-xl"></div>
        </div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium mb-6">
                <HelpCircle className="w-4 h-4" />
                使用教學
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
                簡單三步驟
                <span className="block bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent">
                  輕鬆轉換小說
                </span>
              </h1>
              <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                只需幾個簡單步驟，即可將您喜愛的小說轉換為 EPUB 電子書格式
              </p>
            </div>

            {/* 快捷導航 */}
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                asChild
                variant="outline"
                className="border-2 border-white/80 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:border-white"
              >
                <a href="#steps">
                  <Play className="w-4 h-4 mr-2" />
                  查看步驟
                </a>
              </Button>
              <Button
                asChild
                variant="default"
                className="bg-white text-blue-600 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Link to="/">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  立即體驗
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* 特色功能 */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              為什麼選擇我們？
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              專業、高效、安全的小說轉換服務
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 使用步驟 */}
        <section id="steps" className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">使用步驟</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              只需四個簡單步驟，即可完成小說轉換
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* 連接線 */}
                {index < steps.length - 1 && (
                  <div className="absolute left-8 top-20 w-0.5 h-16 bg-gradient-to-b from-gray-300 to-gray-200 hidden md:block"></div>
                )}

                <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                      {/* 步驟圖示 */}
                      <div className="flex-shrink-0">
                        <div
                          className={`w-16 h-16 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center shadow-lg relative`}
                        >
                          <step.icon className="w-8 h-8 text-white" />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                        </div>
                      </div>

                      {/* 步驟內容 */}
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">
                          {step.title}
                        </h3>
                        <p className="text-gray-600 mb-4 leading-relaxed">
                          {step.description}
                        </p>

                        {/* 提示標籤 */}
                        <div className="flex flex-wrap gap-2">
                          {step.tips.map((tip, tipIndex) => (
                            <span
                              key={tipIndex}
                              className={`inline-flex items-center gap-1 px-3 py-1 ${step.bgLight} ${step.textColor} rounded-full text-sm font-medium`}
                            >
                              <CheckCircle className="w-3 h-3" />
                              {tip}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 箭頭 */}
                      {index < steps.length - 1 && (
                        <div className="hidden lg:block flex-shrink-0">
                          <ArrowRight className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* 常見問題 */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">常見問題</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              解答您使用過程中可能遇到的問題
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <Card
                key={index}
                className="bg-white border border-gray-200 hover:shadow-lg transition-all duration-300"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <faq.icon className={`w-5 h-5 ${faq.color}`} />
                    <span className="text-gray-800">{faq.question}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 示範區塊 */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">使用示範</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              觀看完整的轉換流程演示
            </p>
          </div>

          <Card className="bg-white border border-gray-200 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative group cursor-pointer hover:from-gray-50 hover:to-gray-100 transition-all duration-300">
                <div className="text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-8 h-8 text-blue-600 ml-1" />
                  </div>
                  <p className="text-gray-600 font-medium">點擊播放示範影片</p>
                  <p className="text-sm text-gray-500 mt-1">了解完整轉換流程</p>
                </div>

                {/* 播放按鈕覆蓋層 */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300"></div>
              </div>

              <div className="p-6 bg-gradient-to-r from-blue-50 to-sky-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">
                      轉換流程示範
                    </h4>
                    <p className="text-sm text-gray-600">
                      從輸入網址到下載完成的完整過程
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>約 2 分鐘</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 開始使用 CTA */}
        <section>
          <Card className="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border border-blue-200 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                  <Star className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-3xl font-bold mb-4 text-gray-800">
                  準備好開始使用了嗎？
                </h3>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  立即體驗快速、便利的小說轉換服務
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <Link to="/">
                      <Zap className="w-5 h-5 mr-2" />
                      立即開始轉換
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl hover:border-blue-700 transition-all duration-200"
                  >
                    <Link to="/me">
                      <ChevronRight className="w-5 h-5 mr-2" />
                      查看會員中心
                    </Link>
                  </Button>
                </div>

                <p className="text-sm text-gray-500 mt-6">
                  🎉 無需註冊即可開始轉換，立即體驗
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}

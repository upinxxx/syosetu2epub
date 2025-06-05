import React, { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// 動態載入 Layout 元件
const Layout = React.lazy(() => import("@/components/Layout"));

export default function NotFound() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      }
    >
      <Layout>
        <div className="flex items-center justify-center py-20 px-4">
          <div className="text-center">
            <div className="mb-8">
              <div className="text-8xl font-bold text-gray-200">404</div>
              <p className="text-xl font-semibold text-gray-800 mt-4">
                找不到頁面
              </p>
              <p className="text-gray-600 mt-2 text-sm">
                很抱歉，您要找的頁面不存在或已被移除
              </p>
            </div>

            <div className="space-x-4">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to="/">返回首頁</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Link to="/how-to-use">查看教學</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    </Suspense>
  );
}

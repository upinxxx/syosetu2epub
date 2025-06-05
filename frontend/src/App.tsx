import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@/lib/contexts";
import { ProtectedRoute } from "./lib/components/ProtectedRoute";
import PageTransition from "./components/PageTransition";

// 動態載入頁面元件
const Home = React.lazy(() => import("./pages/Home"));
const Me = React.lazy(() => import("./pages/Me"));
const HowToUse = React.lazy(() => import("./pages/HowToUse"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const OAuthSuccess = React.lazy(() => import("./pages/OAuthSuccess"));
const OAuthError = React.lazy(() => import("./pages/OAuthError"));

// 載入中元件
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* 主頁 */}
            <Route
              path="/"
              element={
                <PageTransition>
                  <Home />
                </PageTransition>
              }
            />

            {/* 需要認證的路由 */}
            <Route
              path="/me"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <Me />
                  </PageTransition>
                </ProtectedRoute>
              }
            />

            {/* 公開路由 */}
            <Route
              path="/how-to-use"
              element={
                <PageTransition>
                  <HowToUse />
                </PageTransition>
              }
            />

            {/* OAuth 相關路由 - 使用獨立路由，避免與其他路由互相影響 */}
            <Route
              path="/oauth/success"
              element={
                <PageTransition>
                  <OAuthSuccess />
                </PageTransition>
              }
            />
            <Route
              path="/oauth/error"
              element={
                <PageTransition>
                  <OAuthError />
                </PageTransition>
              }
            />

            {/* 處理未匹配路由 */}
            <Route
              path="*"
              element={
                <PageTransition>
                  <NotFound />
                </PageTransition>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;

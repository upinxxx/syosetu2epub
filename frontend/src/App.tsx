import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Me from "./pages/Me";
import Orders from "./pages/Orders";
import HowToUse from "./pages/HowToUse";
import NotFound from "./pages/NotFound";
import OAuthSuccess from "./pages/OAuthSuccess";
import OAuthError from "./pages/OAuthError";
import { AuthProvider } from "@/lib/contexts";
import { ProtectedRoute } from "./lib/components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 主頁 */}
          <Route path="/" element={<Home />} />

          {/* 需要認證的路由 */}
          <Route
            path="/me"
            element={
              <ProtectedRoute>
                <Me />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />

          {/* 公開路由 */}
          <Route path="/how-to-use" element={<HowToUse />} />

          {/* OAuth 相關路由 - 使用獨立路由，避免與其他路由互相影響 */}
          <Route path="/oauth">
            <Route path="success" element={<OAuthSuccess />} />
            <Route path="error" element={<OAuthError />} />
            {/* 重定向任何其他 OAuth 路徑回主頁 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* 處理未匹配路由 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

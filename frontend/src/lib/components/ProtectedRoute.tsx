import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = "/",
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  // 如果正在載入，顯示載入指示器
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // 如果未認證，重定向到指定路徑
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // 已認證，渲染子組件
  return <>{children}</>;
};

import React from "react";
import { Button } from "./ui/button";

interface LoginButtonProps {
  className?: string;
}

export const LoginButton: React.FC<LoginButtonProps> = ({ className }) => {
  const handleLogin = () => {
    // 獲取後端 API URL - 恢復原始直接連接模式
    // 由於代理連接有問題，直接連接到後端
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

    // 重定向到 Google OAuth 登入頁面
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <Button onClick={handleLogin} className={className}>
      使用 Google 登入
    </Button>
  );
};

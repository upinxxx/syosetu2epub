import React from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="page-transition-container"
      style={{
        isolation: "isolate",
        animation: "none", // 禁用自動動畫，只在真正的路由變化時才應用
      }}
    >
      <div className="animate-fadeIn">{children}</div>
    </div>
  );
};

export default PageTransition;

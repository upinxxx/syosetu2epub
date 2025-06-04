import React from "react";
import Navbar from "./Navbar";
import { PageTransition } from "./ui/page-transition";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Layout({
  children,
  className = "",
  maxWidth = "2xl",
  padding = "md",
}: LayoutProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    "2xl": "max-w-7xl",
    full: "max-w-full",
  };

  const paddingClasses = {
    none: "",
    sm: "px-4 py-6",
    md: "px-6 py-8",
    lg: "px-8 py-12",
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      <Navbar />
      <main className={`flex-grow ${paddingClasses[padding]}`}>
        <div className={`mx-auto ${maxWidthClasses[maxWidth]} ${className}`}>
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      {/* 裝飾性背景元素 */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-100/30 rounded-full blur-3xl animate-pulse-gentle"></div>
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-secondary-100/20 rounded-full blur-3xl animate-pulse-gentle"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-0 w-64 h-64 bg-success-100/20 rounded-full blur-3xl animate-pulse-gentle"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>
    </div>
  );
}

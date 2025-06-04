import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Info,
} from "lucide-react";
import { cva } from "class-variance-authority";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";
export type ToastPosition =
  | "top-right"
  | "bottom-right"
  | "top-left"
  | "bottom-left";

export interface ToastProps {
  title: string;
  message?: string;
  variant?: ToastVariant;
  position?: ToastPosition;
  duration?: number;
  onClose?: () => void;
  action?: React.ReactNode;
}

const toastVariants = cva(
  "flex w-full max-w-sm bg-white/95 backdrop-blur-lg shadow-2xl rounded-2xl pointer-events-auto overflow-hidden border border-white/20 transform-gpu transition-all duration-300 ease-smooth",
  {
    variants: {
      variant: {
        default: "border-l-4 border-l-neutral-400 shadow-neutral-200/50",
        success: "border-l-4 border-l-success-500 shadow-success-200/50",
        error: "border-l-4 border-l-error-500 shadow-error-200/50",
        warning: "border-l-4 border-l-warning-500 shadow-warning-200/50",
        info: "border-l-4 border-l-primary-500 shadow-primary-200/50",
      },
      position: {
        "top-right": "animate-slide-in-right",
        "bottom-right": "animate-slide-in-right",
        "top-left": "animate-slide-in-left",
        "bottom-left": "animate-slide-in-left",
      },
    },
    defaultVariants: {
      variant: "default",
      position: "bottom-right",
    },
  }
);

const getIcon = (variant: ToastVariant) => {
  const iconClasses = "h-5 w-5 flex-shrink-0";

  switch (variant) {
    case "success":
      return <CheckCircle className={`${iconClasses} text-success-500`} />;
    case "error":
      return <AlertCircle className={`${iconClasses} text-error-500`} />;
    case "warning":
      return <AlertCircle className={`${iconClasses} text-warning-500`} />;
    case "info":
      return <Info className={`${iconClasses} text-primary-500`} />;
    default:
      return <RefreshCw className={`${iconClasses} text-neutral-500`} />;
  }
};

const getBackgroundGradient = (variant: ToastVariant) => {
  switch (variant) {
    case "success":
      return "bg-gradient-to-r from-success-50 to-emerald-50";
    case "error":
      return "bg-gradient-to-r from-error-50 to-red-50";
    case "warning":
      return "bg-gradient-to-r from-warning-50 to-orange-50";
    case "info":
      return "bg-gradient-to-r from-primary-50 to-blue-50";
    default:
      return "bg-gradient-to-r from-neutral-50 to-gray-50";
  }
};

export const Toast: React.FC<ToastProps> = ({
  title,
  message,
  variant = "default",
  position = "bottom-right",
  duration = 5000,
  onClose,
  action,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          if (onClose) onClose();
        }, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`${toastVariants({ variant, position })} ${
        isExiting ? "animate-fade-out scale-95 opacity-0" : ""
      }`}
    >
      {/* 背景漸變層 */}
      <div
        className={`absolute inset-0 ${getBackgroundGradient(
          variant
        )} opacity-30`}
      />

      {/* 內容區域 */}
      <div className="relative flex-1 p-4">
        <div className="flex items-start space-x-3">
          {/* 圖示 */}
          <div className="flex-shrink-0 mt-0.5">{getIcon(variant)}</div>

          {/* 文字內容 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {title}
            </p>
            {message && (
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                {message}
              </p>
            )}
            {action && <div className="mt-3">{action}</div>}
          </div>

          {/* 關閉按鈕 */}
          <div className="flex-shrink-0">
            <button
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              onClick={handleClose}
            >
              <span className="sr-only">關閉</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 進度條 (如果有持續時間) */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/30">
          <div
            className={`h-full transition-all ease-linear ${
              variant === "success"
                ? "bg-success-500"
                : variant === "error"
                ? "bg-error-500"
                : variant === "warning"
                ? "bg-warning-500"
                : variant === "info"
                ? "bg-primary-500"
                : "bg-neutral-500"
            }`}
            style={{
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastContainer: React.FC<{
  position?: ToastPosition;
  children: React.ReactNode;
}> = ({ position = "bottom-right", children }) => {
  const positionClasses = {
    "top-right": "top-4 right-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-left": "bottom-4 left-4",
  };

  return (
    <>
      {/* 添加進度條動畫的 CSS */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      <div
        className={`fixed z-50 ${positionClasses[position]} flex flex-col gap-3 max-w-sm w-full`}
      >
        {children}
      </div>
    </>
  );
};

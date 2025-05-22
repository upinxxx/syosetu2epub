import React, { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";
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
  "flex w-full max-w-sm bg-white shadow-lg rounded-lg pointer-events-auto overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-gray-200",
        success: "border-green-500",
        error: "border-red-500",
        warning: "border-yellow-500",
        info: "border-blue-500",
      },
      position: {
        "top-right": "animate-enter-right",
        "bottom-right": "animate-enter-right",
        "top-left": "animate-enter-left",
        "bottom-left": "animate-enter-left",
      },
    },
    defaultVariants: {
      variant: "default",
      position: "bottom-right",
    },
  }
);

const getIcon = (variant: ToastVariant) => {
  switch (variant) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "error":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case "warning":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case "info":
      return <Clock className="h-5 w-5 text-blue-500" />;
    default:
      return <RefreshCw className="h-5 w-5 text-gray-500" />;
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

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={toastVariants({ variant, position })}>
      <div className="flex-1 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{getIcon(variant)}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
            {action && <div className="mt-3">{action}</div>}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={() => {
                setIsVisible(false);
                if (onClose) onClose();
              }}
            >
              <span className="sr-only">關閉</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<{
  position?: ToastPosition;
  children: React.ReactNode;
}> = ({ position = "bottom-right", children }) => {
  const positionClasses = {
    "top-right": "top-0 right-0",
    "bottom-right": "bottom-0 right-0",
    "top-left": "top-0 left-0",
    "bottom-left": "bottom-0 left-0",
  };

  return (
    <div
      className={`fixed z-50 p-4 ${positionClasses[position]} flex flex-col gap-2`}
    >
      {children}
    </div>
  );
};

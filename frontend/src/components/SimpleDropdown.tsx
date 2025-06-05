import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  sideOffset?: number;
  className?: string;
}

export function SimpleDropdown({
  trigger,
  children,
  align = "end",
  sideOffset = 4,
  className = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = triggerRect.bottom + sideOffset;
    let left = triggerRect.left;

    // 如果對齊到右邊
    if (align === "end") {
      left = triggerRect.right - 288; // 假設下拉菜單寬度為 w-72 (18rem = 288px)
    }

    // 確保不超出視窗邊界
    if (left + 288 > viewportWidth) {
      left = viewportWidth - 288 - 16; // 16px 邊距
    }
    if (left < 16) {
      left = 16;
    }

    if (top + 400 > viewportHeight) {
      // 如果下方空間不足，顯示在上方
      top = triggerRect.top - sideOffset - 400;
    }

    setPosition({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);

      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div ref={triggerRef} onClick={toggleDropdown}>
        {trigger}
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed z-[100] w-72 bg-white/98 backdrop-blur-lg border border-gray-200/80 shadow-2xl rounded-2xl p-2 transition-all duration-200 ${className}`}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}

// 輔助元件
export function DropdownLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`font-normal p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mb-2 ${className}`}
    >
      {children}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg group cursor-pointer ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function DropdownSeparator({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200/60 my-2 h-px ${className}`} />;
}

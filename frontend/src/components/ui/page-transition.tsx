import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    if (location !== displayLocation) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setIsVisible(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [location, displayLocation]);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-smooth",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
    >
      {children}
    </div>
  );
}

interface FadeTransitionProps {
  children: React.ReactNode;
  show: boolean;
  className?: string;
}

export function FadeTransition({
  children,
  show,
  className,
}: FadeTransitionProps) {
  return (
    <div
      className={cn(
        "transition-all duration-500 ease-smooth",
        show ? "opacity-100 scale-100" : "opacity-0 scale-95",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SlideTransitionProps {
  children: React.ReactNode;
  show: boolean;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}

export function SlideTransition({
  children,
  show,
  direction = "up",
  className,
}: SlideTransitionProps) {
  const getTransform = () => {
    if (show) return "translate-x-0 translate-y-0";

    switch (direction) {
      case "up":
        return "translate-y-4";
      case "down":
        return "-translate-y-4";
      case "left":
        return "translate-x-4";
      case "right":
        return "-translate-x-4";
      default:
        return "translate-y-4";
    }
  };

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-smooth",
        show ? "opacity-100" : "opacity-0",
        getTransform(),
        className
      )}
    >
      {children}
    </div>
  );
}

interface ScaleTransitionProps {
  children: React.ReactNode;
  show: boolean;
  className?: string;
}

export function ScaleTransition({
  children,
  show,
  className,
}: ScaleTransitionProps) {
  return (
    <div
      className={cn(
        "transition-all duration-200 ease-bounce",
        show ? "opacity-100 scale-100" : "opacity-0 scale-95",
        className
      )}
    >
      {children}
    </div>
  );
}

interface StaggeredTransitionProps {
  children: React.ReactNode[];
  show: boolean;
  delay?: number;
  className?: string;
}

export function StaggeredTransition({
  children,
  show,
  delay = 100,
  className,
}: StaggeredTransitionProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={cn(
            "transition-all duration-300 ease-smooth",
            show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{
            transitionDelay: show ? `${index * delay}ms` : "0ms",
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

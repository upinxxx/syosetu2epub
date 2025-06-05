import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

interface PortalProps {
  children: ReactNode;
  className?: string;
}

export default function Portal({ children, className = "" }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className={className}>{children}</div>,
    document.body
  );
}

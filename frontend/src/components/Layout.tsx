import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-grow">{children}</main>
    </div>
  );
}

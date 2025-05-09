import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Syosetu2EPUB
            </Link>
          </div>

          {/* 桌面版導航 */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
            >
              首頁
            </Link>
            <Link
              to="/jobs/:jobId"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
            >
              任務狀態
            </Link>
            <Link
              to="/how-to-use"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
            >
              使用教學
            </Link>
            <Link
              to="/me"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
            >
              會員中心
            </Link>
          </nav>

          {/* 登入/註冊按鈕(桌面版) */}
          <div className="hidden md:flex items-center">
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-blue-600 text-blue-600 hover:bg-blue-50"
              asChild
            >
              <Link to="/me">登入</Link>
            </Button>
          </div>

          {/* 手機版選單按鈕 */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={toggleMenu}
            >
              <span className="sr-only">開啟選單</span>
              {!isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 手機版選單 */}
      {isMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              首頁
            </Link>
            <Link
              to="/jobs/:jobId"
              className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              任務狀態
            </Link>
            <Link
              to="/how-to-use"
              className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              使用教學
            </Link>
            <Link
              to="/me"
              className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              會員中心
            </Link>
            <div className="pt-4">
              <Button className="w-full justify-center" size="sm" asChild>
                <Link to="/me">登入/註冊</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

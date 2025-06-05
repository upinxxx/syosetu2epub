import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/AuthContext";
import { LoginButton } from "./LoginButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  User,
  BookOpen,
  HelpCircle,
  Sparkles,
  Zap,
  Menu,
  X,
} from "lucide-react";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 獲取用戶頭像或顯示名稱的首字母
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // 關閉行動裝置菜單
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-40 shadow-lg">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link
              to="/"
              className="flex items-center space-x-3 group transition-all duration-300 hover:scale-105"
              onClick={closeMobileMenu}
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-3">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Syosetu2EPUB
                </span>
                <div className="text-xs text-gray-500 font-medium -mt-1">
                  小說轉換專家
                </div>
              </div>
            </Link>
          </div>

          {/* 桌面版導航連結 */}
          <nav className="hidden md:flex items-center space-x-2">
            {/* 移除使用說明選項 */}
          </nav>

          {/* 桌面版登入/用戶資訊按鈕 */}
          <div className="hidden md:flex items-center space-x-3">
            {!isAuthenticated ? (
              <LoginButton className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-6 py-2 rounded-lg font-medium" />
            ) : (
              <div className="flex items-center space-x-3">
                {/* 會員狀態指示 */}
                <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full">
                  <Sparkles className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-green-700">
                    正式會員
                  </span>
                </div>

                {/* 用戶頭像下拉菜單 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full hover:bg-blue-50 transition-all duration-300 ring-2 ring-transparent hover:ring-blue-200"
                    >
                      <Avatar className="h-9 w-9 shadow-md">
                        {user?.avatar && (
                          <AvatarImage
                            src={user.avatar}
                            alt={user.displayName}
                          />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
                          {user?.displayName
                            ? getInitials(user.displayName)
                            : "U"}
                        </AvatarFallback>
                      </Avatar>
                      {/* 在線狀態指示器 */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-72 bg-white/98 backdrop-blur-lg border border-gray-200/80 shadow-2xl rounded-2xl p-2 z-50"
                    align="end"
                    sideOffset={5}
                  >
                    {/* 用戶信息頭部 */}
                    <DropdownMenuLabel className="font-normal p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mb-2">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12 shadow-lg">
                          {user?.avatar && (
                            <AvatarImage
                              src={user.avatar}
                              alt={user.displayName}
                            />
                          )}
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                            {user?.displayName
                              ? getInitials(user.displayName)
                              : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {user?.displayName || "會員"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email}
                          </p>
                          <div className="flex items-center space-x-1 mt-1">
                            <Zap className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-600 font-medium">
                              正式會員
                            </span>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="bg-gray-200/60 my-2" />

                    {/* 菜單項目 */}
                    <DropdownMenuItem asChild>
                      <Link
                        to="/me"
                        className="flex w-full cursor-pointer items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg group"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors duration-200">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-medium">會員中心</span>
                          <p className="text-xs text-gray-500">
                            管理帳戶和設定
                          </p>
                        </div>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-gray-200/60 my-2" />

                    <DropdownMenuItem
                      onClick={logout}
                      className="px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-lg group cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-red-200 transition-colors duration-200">
                        <LogOut className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <span className="font-medium">登出</span>
                        <p className="text-xs text-gray-500">安全退出帳戶</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* 行動裝置菜單按鈕 */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
            >
              <div className="relative">
                <Menu
                  className={`h-6 w-6 transition-all duration-300 ${
                    isMobileMenuOpen
                      ? "scale-0 rotate-90 opacity-0"
                      : "scale-100 rotate-0 opacity-100"
                  }`}
                />
                <X
                  className={`h-6 w-6 absolute inset-0 transition-all duration-300 ${
                    isMobileMenuOpen
                      ? "scale-100 rotate-0 opacity-100"
                      : "scale-0 -rotate-90 opacity-0"
                  }`}
                />
              </div>
            </Button>
          </div>
        </div>

        {/* 行動裝置菜單 */}
        <div
          className={`md:hidden border-t border-gray-200/60 bg-white/95 backdrop-blur-lg overflow-hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen
              ? "max-h-96 opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2"
          }`}
        >
          <div
            className={`px-2 pt-2 pb-3 space-y-1 transition-all duration-300 ease-in-out delay-75 ${
              isMobileMenuOpen
                ? "transform translate-y-0 opacity-100"
                : "transform -translate-y-4 opacity-0"
            }`}
          >
            {/* 移除導航連結中的使用說明 */}

            {/* 登入/用戶資訊 */}
            {!isAuthenticated ? (
              <div className="px-3 py-3">
                <LoginButton className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-lg font-medium" />
              </div>
            ) : (
              <div className="space-y-1">
                {/* 用戶資訊卡片 */}
                <div className="mx-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 shadow-md">
                      {user?.avatar && (
                        <AvatarImage src={user.avatar} alt={user.displayName} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
                        {user?.displayName
                          ? getInitials(user.displayName)
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {user?.displayName || "會員"}
                      </p>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <Sparkles className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">
                          正式會員
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 菜單項目 */}
                <Link
                  to="/me"
                  onClick={closeMobileMenu}
                  className="flex items-center px-3 py-3 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 mx-3"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-medium text-sm">會員中心</span>
                    <p className="text-xs text-gray-500">管理帳戶和設定</p>
                  </div>
                </Link>

                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="flex items-center w-full px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 mx-3"
                >
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                    <LogOut className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-sm">登出</span>
                    <p className="text-xs text-gray-500">安全退出帳戶</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

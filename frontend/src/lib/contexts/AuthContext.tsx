import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/api-client";
import type { UserProfile } from "@/lib/api-client";
import { isAxiosError, AxiosError } from "axios";

interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  kindleEmail?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshAuth: (force?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // 防止同時進行多次認證檢查
  const isRefreshing = useRef(false);
  // 上次檢查時間
  const lastAuthCheck = useRef<number>(0);
  // 認證快取過期時間（5分鐘）
  const AUTH_CACHE_TTL = 5 * 60 * 1000;

  // 檢查可見的 cookie 來判斷登入狀態
  const checkVisibleCookie = useCallback(() => {
    return document.cookie.includes("is_logged_in=true");
  }, []);

  const refreshAuth = useCallback(
    async (force: boolean = false) => {
      // 如果已經在進行認證檢查，對於非強制刷新則跳過
      if (isRefreshing.current && !force) {
        // console.log("已有認證檢查進行中，跳過重複請求");
        return;
      }

      // 對於強制刷新，等待當前檢查完成
      if (isRefreshing.current && force) {
        while (isRefreshing.current) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        // 如果是強制刷新，繼續執行
      }

      setIsLoading(true);

      // 檢查是否在快取有效期內（除非強制刷新）
      const now = Date.now();
      const timeSinceLastCheck = now - lastAuthCheck.current;

      if (
        !force &&
        timeSinceLastCheck < AUTH_CACHE_TTL &&
        lastAuthCheck.current > 0
      ) {
        // console.log("使用快取的認證狀態，跳過 API 請求");
        setIsLoading(false);
        return;
      }

      try {
        isRefreshing.current = true;
        // console.log(`開始檢查認證狀態...${force ? " (強制刷新)" : ""}`);

        // 首先檢查可見 cookie
        const hasVisibleCookie = checkVisibleCookie();
        // console.log("可見 Cookie 檢查結果:", hasVisibleCookie);

        if (!hasVisibleCookie) {
          // console.log("未檢測到登入 cookie，無需發送 API 請求");
          setUser(null);
          setIsAuthenticated(false);
          lastAuthCheck.current = now;
          setIsLoading(false);
          isRefreshing.current = false;
          return;
        }

        const response = await apiClient.auth.me();

        // console.log("認證狀態響應:", response.data);
        if (response.success && response.data?.isAuthenticated) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }

        // 更新最後檢查時間
        lastAuthCheck.current = now;
      } catch (error) {
        console.error("驗證狀態檢查失敗", error);
        if (isAxiosError(error)) {
          console.error("錯誤詳情:", {
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers,
          });
        }
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
        isRefreshing.current = false;
      }
    },
    [checkVisibleCookie]
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.auth.logout();
      setUser(null);
      setIsAuthenticated(false);
      // 重置認證檢查時間並清除快取
      lastAuthCheck.current = 0;
    } catch (error) {
      console.error("登出失敗", error);
    }
  }, []);

  // 在組件掛載時檢查認證狀態
  useEffect(() => {
    // 延遲執行認證檢查，避免與其他組件衝突
    const timer = setTimeout(() => {
      refreshAuth();
    }, 100);

    // 不依賴任何變量，確保只在組件掛載時執行一次
    return () => clearTimeout(timer);
  }, [refreshAuth]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth 必須在 AuthProvider 內使用");
  }
  return context;
};

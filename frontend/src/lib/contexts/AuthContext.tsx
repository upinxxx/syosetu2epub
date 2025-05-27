import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import axios from "axios";

interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
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

  // 恢復直接連接後端的設定
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // 檢查可見的 cookie 來判斷登入狀態
  const checkVisibleCookie = useCallback(() => {
    return document.cookie.includes("is_logged_in=true");
  }, []);

  const refreshAuth = useCallback(async () => {
    // 如果已經在進行認證檢查，則跳過
    if (isRefreshing.current) {
      console.log("已有認證檢查進行中，跳過重複請求");
      return;
    }

    // 檢查是否在快取有效期內
    const now = Date.now();
    const timeSinceLastCheck = now - lastAuthCheck.current;

    if (timeSinceLastCheck < AUTH_CACHE_TTL && lastAuthCheck.current > 0) {
      console.log("使用快取的認證狀態，跳過 API 請求");
      return;
    }

    try {
      isRefreshing.current = true;
      setIsLoading(true);
      console.log("開始檢查認證狀態...");

      // 首先檢查可見 cookie
      const hasVisibleCookie = checkVisibleCookie();
      console.log("可見 Cookie 檢查結果:", hasVisibleCookie);

      if (!hasVisibleCookie) {
        console.log("未檢測到登入 cookie，無需發送 API 請求");
        setUser(null);
        setIsAuthenticated(false);
        lastAuthCheck.current = now;
        return;
      }

      const response = await axios.get(`${apiUrl}/api/auth/status`, {
        withCredentials: true, // 必須設置，以便發送 Cookie
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log("認證狀態響應:", response.data);
      if (response.data.isAuthenticated) {
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
      if (axios.isAxiosError(error)) {
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
  }, [apiUrl, checkVisibleCookie]);

  const logout = useCallback(async () => {
    try {
      await axios.post(
        `${apiUrl}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      setUser(null);
      setIsAuthenticated(false);
      // 重置認證檢查時間
      lastAuthCheck.current = 0;
    } catch (error) {
      console.error("登出失敗", error);
    }
  }, [apiUrl]);

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

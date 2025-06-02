import { useState, useEffect, useCallback } from "react";

interface CooldownState {
  isInCooldown: boolean;
  remainingSeconds: number;
  lastSentAt?: Date;
}

interface CooldownData {
  epubJobId: string;
  endTime: number; // timestamp
}

const COOLDOWN_DURATION = 60; // 60 秒
const STORAGE_KEY_PREFIX = "kindle_cooldown_";

/**
 * 自訂 Hook 用於管理 Send to Kindle 的冷卻機制
 * @param epubJobId EPUB 任務 ID
 * @returns 冷卻狀態和控制方法
 */
export function useCooldown(epubJobId: string) {
  const [cooldownState, setCooldownState] = useState<CooldownState>({
    isInCooldown: false,
    remainingSeconds: 0,
  });

  const storageKey = `${STORAGE_KEY_PREFIX}${epubJobId}`;

  // 從 localStorage 載入冷卻狀態
  const loadCooldownFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data: CooldownData = JSON.parse(stored);
        const now = Date.now();

        if (now < data.endTime) {
          const remainingSeconds = Math.ceil((data.endTime - now) / 1000);
          setCooldownState({
            isInCooldown: true,
            remainingSeconds,
            lastSentAt: new Date(data.endTime - COOLDOWN_DURATION * 1000),
          });
          return true;
        } else {
          // 冷卻已結束，清理過期資料
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error("載入冷卻狀態失敗:", error);
      localStorage.removeItem(storageKey);
    }
    return false;
  }, [storageKey]);

  // 開始冷卻
  const startCooldown = useCallback(() => {
    const now = Date.now();
    const endTime = now + COOLDOWN_DURATION * 1000;

    const cooldownData: CooldownData = {
      epubJobId,
      endTime,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(cooldownData));
    } catch (error) {
      console.error("保存冷卻狀態失敗:", error);
    }

    setCooldownState({
      isInCooldown: true,
      remainingSeconds: COOLDOWN_DURATION,
      lastSentAt: new Date(now),
    });
  }, [epubJobId, storageKey]);

  // 清除冷卻狀態
  const clearCooldown = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("清除冷卻狀態失敗:", error);
    }

    setCooldownState({
      isInCooldown: false,
      remainingSeconds: 0,
    });
  }, [storageKey]);

  // 處理伺服器回傳的冷卻錯誤
  const handleServerCooldownError = useCallback(
    (errorMessage: string) => {
      // 嘗試從錯誤訊息中提取剩餘秒數
      const match = errorMessage.match(/請等待\s*(\d+)\s*秒/);
      if (match) {
        const remainingSeconds = parseInt(match[1], 10);
        const now = Date.now();
        const endTime = now + remainingSeconds * 1000;

        const cooldownData: CooldownData = {
          epubJobId,
          endTime,
        };

        try {
          localStorage.setItem(storageKey, JSON.stringify(cooldownData));
        } catch (error) {
          console.error("保存伺服器冷卻狀態失敗:", error);
        }

        setCooldownState({
          isInCooldown: true,
          remainingSeconds,
          lastSentAt: new Date(
            now - (COOLDOWN_DURATION - remainingSeconds) * 1000
          ),
        });
      }
    },
    [epubJobId, storageKey]
  );

  // 初始化時載入狀態
  useEffect(() => {
    loadCooldownFromStorage();
  }, [loadCooldownFromStorage]);

  // 倒數計時器
  useEffect(() => {
    if (!cooldownState.isInCooldown || cooldownState.remainingSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownState((prev) => {
        const newRemaining = prev.remainingSeconds - 1;

        if (newRemaining <= 0) {
          // 冷卻結束，清理狀態
          clearCooldown();
          return {
            isInCooldown: false,
            remainingSeconds: 0,
          };
        }

        return {
          ...prev,
          remainingSeconds: newRemaining,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    cooldownState.isInCooldown,
    cooldownState.remainingSeconds,
    clearCooldown,
  ]);

  // 清理過期的 localStorage 記錄
  useEffect(() => {
    const cleanupExpiredCooldowns = () => {
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const data: CooldownData = JSON.parse(stored);
              if (now >= data.endTime) {
                keysToRemove.push(key);
              }
            }
          } catch (error) {
            // 無效的資料，標記為刪除
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error("清理過期冷卻記錄失敗:", error);
        }
      });
    };

    // 立即清理一次
    cleanupExpiredCooldowns();

    // 每分鐘清理一次
    const cleanupInterval = setInterval(cleanupExpiredCooldowns, 60000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    isInCooldown: cooldownState.isInCooldown,
    remainingSeconds: cooldownState.remainingSeconds,
    lastSentAt: cooldownState.lastSentAt,
    startCooldown,
    clearCooldown,
    handleServerCooldownError,
  };
}

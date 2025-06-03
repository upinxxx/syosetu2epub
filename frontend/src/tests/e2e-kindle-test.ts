/**
 * Kindle 功能端到端測試
 * 測試 Send to Kindle 的完整流程
 *
 * 測試流程：
 * 1. 用戶認證檢查
 * 2. Kindle 郵箱設定
 * 3. 發送到 Kindle
 * 4. 交付狀態追蹤
 * 5. 交付歷史查詢
 */

import { apiClient } from "@/lib/api-client";
import { debug } from "@/lib/debug.js";
import { handleError, validateApiResponse } from "@/lib/error-handler";
import type {
  SendToKindleDto,
  KindleDeliveryResponse,
  KindleStatusResponse,
  KindleHistoryResponse,
  UpdateProfileDto,
} from "@/lib/api-client";

// Kindle 測試配置
const KINDLE_TEST_CONFIG = {
  // 測試用的 Kindle 郵箱
  TEST_KINDLE_EMAIL: "test@kindle.com",
  // 測試用的任務 ID（需要是已完成的轉換任務）
  TEST_JOB_ID: "test-job-id-12345",
  // 輪詢配置
  POLLING: {
    MAX_ATTEMPTS: 20, // 最大輪詢次數（2分鐘）
    INTERVAL: 6000, // 輪詢間隔（6秒）
    TIMEOUT: 120000, // 總超時時間（2分鐘）
  },
  // 測試超時配置
  TIMEOUTS: {
    SEND: 15000, // 發送請求超時（15秒）
    STATUS: 5000, // 狀態查詢超時（5秒）
    HISTORY: 10000, // 歷史查詢超時（10秒）
    PROFILE: 8000, // 個人資料更新超時（8秒）
  },
};

// Kindle 測試結果
interface KindleTestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

// Kindle 測試統計
interface KindleTestStats {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: KindleTestResult[];
}

/**
 * 等待指定時間
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 帶超時的 Promise
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * 測試用戶認證狀態
 */
async function testUserAuthentication(): Promise<KindleTestResult> {
  const startTime = Date.now();
  const testName = "用戶認證狀態測試";

  debug.info("KINDLE_TEST", `開始 ${testName}`);

  try {
    const response = await withTimeout(
      apiClient.users.getProfile(),
      KINDLE_TEST_CONFIG.TIMEOUTS.PROFILE,
      "獲取用戶資料超時"
    );

    debug.debug("KINDLE_TEST", "用戶資料響應", { response });

    // 驗證響應格式
    const validation = validateApiResponse(response, "獲取用戶資料");
    if (!validation.isValid) {
      throw new Error(validation.error?.userMessage || "用戶資料響應格式無效");
    }

    const userData = validation.data as any;
    const hasKindleEmail = !!userData?.kindleEmail;

    const duration = Date.now() - startTime;
    debug.info("KINDLE_TEST", `${testName} 成功`, {
      duration,
      hasKindleEmail,
      userEmail: userData?.email,
    });

    return {
      testName,
      success: true,
      duration,
      details: {
        isAuthenticated: true,
        hasKindleEmail,
        userEmail: userData?.email,
        kindleEmail: userData?.kindleEmail,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("KINDLE_TEST", `${testName} 失敗`, { error, duration });

    return {
      testName,
      success: false,
      duration,
      error: error.message,
      details: { error },
    };
  }
}

/**
 * 測試 Kindle 郵箱設定
 */
async function testKindleEmailSetup(): Promise<KindleTestResult> {
  const startTime = Date.now();
  const testName = "Kindle 郵箱設定測試";

  debug.info("KINDLE_TEST", `開始 ${testName}`);

  try {
    const updateData: UpdateProfileDto = {
      kindleEmail: KINDLE_TEST_CONFIG.TEST_KINDLE_EMAIL,
    };

    debug.debug("KINDLE_TEST", "更新 Kindle 郵箱", { updateData });

    const response = await withTimeout(
      apiClient.users.updateProfile(updateData),
      KINDLE_TEST_CONFIG.TIMEOUTS.PROFILE,
      "更新 Kindle 郵箱超時"
    );

    debug.debug("KINDLE_TEST", "更新響應", { response });

    // 驗證響應格式
    const validation = validateApiResponse(response, "更新 Kindle 郵箱");
    if (!validation.isValid) {
      throw new Error(validation.error?.userMessage || "更新響應格式無效");
    }

    const updatedUser = validation.data as any;
    const kindleEmailSet =
      updatedUser?.kindleEmail === KINDLE_TEST_CONFIG.TEST_KINDLE_EMAIL;

    if (!kindleEmailSet) {
      throw new Error("Kindle 郵箱設定失敗");
    }

    const duration = Date.now() - startTime;
    debug.info("KINDLE_TEST", `${testName} 成功`, {
      duration,
      kindleEmail: updatedUser?.kindleEmail,
    });

    return {
      testName,
      success: true,
      duration,
      details: {
        kindleEmail: updatedUser?.kindleEmail,
        updateData,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("KINDLE_TEST", `${testName} 失敗`, { error, duration });

    return {
      testName,
      success: false,
      duration,
      error: error.message,
      details: { error },
    };
  }
}

/**
 * 測試發送到 Kindle
 */
async function testSendToKindle(jobId: string): Promise<KindleTestResult> {
  const startTime = Date.now();
  const testName = `發送到 Kindle 測試 - ${jobId}`;

  debug.info("KINDLE_TEST", `開始 ${testName}`);

  try {
    const sendData: SendToKindleDto = {
      jobId,
      kindleEmail: KINDLE_TEST_CONFIG.TEST_KINDLE_EMAIL,
    };

    debug.debug("KINDLE_TEST", "發送到 Kindle 請求", { sendData });

    const response = await withTimeout(
      apiClient.kindle.send(sendData),
      KINDLE_TEST_CONFIG.TIMEOUTS.SEND,
      "發送到 Kindle 超時"
    );

    debug.debug("KINDLE_TEST", "發送響應", { response });

    // 驗證響應格式
    if (!response || !response.success) {
      throw new Error(`發送失敗: ${response?.message || "未知錯誤"}`);
    }

    // 正確處理響應數據類型
    let deliveryData: any;
    if ("data" in response && response.data) {
      deliveryData = response.data;
    } else {
      deliveryData = response;
    }

    const deliveryId = deliveryData?.id;
    if (!deliveryId) {
      throw new Error("發送響應中缺少交付 ID");
    }

    const duration = Date.now() - startTime;
    debug.info("KINDLE_TEST", `${testName} 成功`, {
      duration,
      deliveryId,
    });

    return {
      testName,
      success: true,
      duration,
      details: {
        deliveryId,
        jobId,
        kindleEmail: sendData.kindleEmail,
        response,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("KINDLE_TEST", `${testName} 失敗`, { error, duration });

    return {
      testName,
      success: false,
      duration,
      error: error.message,
      details: { error, jobId },
    };
  }
}

/**
 * 測試交付狀態追蹤
 */
async function testDeliveryStatusTracking(
  deliveryId: string
): Promise<KindleTestResult> {
  const startTime = Date.now();
  const testName = `交付狀態追蹤測試 - ${deliveryId}`;

  debug.info("KINDLE_TEST", `開始 ${testName}`);

  try {
    let attempts = 0;
    let lastStatus = "unknown";
    const statusHistory: string[] = [];

    while (attempts < KINDLE_TEST_CONFIG.POLLING.MAX_ATTEMPTS) {
      attempts++;

      debug.debug(
        "KINDLE_TEST",
        `狀態查詢嘗試 ${attempts}/${KINDLE_TEST_CONFIG.POLLING.MAX_ATTEMPTS}`,
        { deliveryId }
      );

      const response = await withTimeout(
        apiClient.kindle.getStatus(deliveryId),
        KINDLE_TEST_CONFIG.TIMEOUTS.STATUS,
        "狀態查詢超時"
      );

      debug.debug("KINDLE_TEST", `狀態響應 ${attempts}`, { response });

      // 解析狀態
      let statusData: any;
      if ("data" in response && response.data) {
        statusData = response.data;
      } else {
        statusData = response;
      }

      const status = statusData?.status?.toLowerCase() || "unknown";

      if (status !== lastStatus) {
        statusHistory.push(status);
        lastStatus = status;
        debug.info("KINDLE_TEST", `狀態變更: ${status}`, {
          deliveryId,
          attempts,
        });
      }

      // 檢查終止狀態
      if (status === "completed") {
        const sentAt = statusData?.sentAt;

        const duration = Date.now() - startTime;
        debug.info("KINDLE_TEST", `${testName} 成功完成`, {
          duration,
          attempts,
          statusHistory,
          sentAt,
        });

        return {
          testName,
          success: true,
          duration,
          details: {
            attempts,
            statusHistory,
            finalStatus: status,
            sentAt,
            deliveryId,
          },
        };
      }

      if (status === "failed") {
        const errorMessage = statusData?.errorMessage;
        throw new Error(`交付失敗: ${errorMessage || "未知錯誤"}`);
      }

      // 等待下次輪詢
      if (attempts < KINDLE_TEST_CONFIG.POLLING.MAX_ATTEMPTS) {
        await sleep(KINDLE_TEST_CONFIG.POLLING.INTERVAL);
      }
    }

    // 超過最大嘗試次數
    throw new Error(
      `狀態追蹤超時，最後狀態: ${lastStatus}，嘗試次數: ${attempts}`
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("KINDLE_TEST", `${testName} 失敗`, { error, duration });

    return {
      testName,
      success: false,
      duration,
      error: error.message,
      details: { error, deliveryId },
    };
  }
}

/**
 * 測試交付歷史查詢
 */
async function testDeliveryHistory(): Promise<KindleTestResult> {
  const startTime = Date.now();
  const testName = "交付歷史查詢測試";

  debug.info("KINDLE_TEST", `開始 ${testName}`);

  try {
    const response = await withTimeout(
      apiClient.kindle.getHistory({ page: 1, limit: 10 }),
      KINDLE_TEST_CONFIG.TIMEOUTS.HISTORY,
      "歷史查詢超時"
    );

    debug.debug("KINDLE_TEST", "歷史查詢響應", { response });

    // 驗證響應格式
    const validation = validateApiResponse(response, "交付歷史查詢");
    if (!validation.isValid) {
      throw new Error(validation.error?.userMessage || "歷史查詢響應格式無效");
    }

    const historyData = validation.data as any;
    const items = historyData?.items || [];
    const meta = historyData?.meta;

    const duration = Date.now() - startTime;
    debug.info("KINDLE_TEST", `${testName} 成功`, {
      duration,
      itemCount: items.length,
      totalItems: meta?.totalItems,
    });

    return {
      testName,
      success: true,
      duration,
      details: {
        itemCount: items.length,
        totalItems: meta?.totalItems,
        totalPages: meta?.totalPages,
        currentPage: meta?.page,
        items: items.slice(0, 3), // 只記錄前3個項目
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("KINDLE_TEST", `${testName} 失敗`, { error, duration });

    return {
      testName,
      success: false,
      duration,
      error: error.message,
      details: { error },
    };
  }
}

/**
 * 測試完整的 Kindle 流程
 */
async function testFullKindleFlow(jobId: string): Promise<KindleTestResult[]> {
  const testName = `完整 Kindle 流程測試 - ${jobId}`;
  const startTime = Date.now();
  const results: KindleTestResult[] = [];

  debug.info("KINDLE_TEST", `開始 ${testName}`);

  try {
    // 步驟 1: 測試用戶認證
    const authResult = await testUserAuthentication();
    results.push(authResult);

    if (!authResult.success) {
      debug.error("KINDLE_TEST", "用戶認證失敗，跳過後續測試");
      return results;
    }

    // 步驟 2: 測試 Kindle 郵箱設定
    const emailSetupResult = await testKindleEmailSetup();
    results.push(emailSetupResult);

    if (!emailSetupResult.success) {
      debug.error("KINDLE_TEST", "Kindle 郵箱設定失敗，跳過後續測試");
      return results;
    }

    // 步驟 3: 測試發送到 Kindle
    const sendResult = await testSendToKindle(jobId);
    results.push(sendResult);

    if (!sendResult.success) {
      debug.error("KINDLE_TEST", "發送到 Kindle 失敗，跳過狀態追蹤");
      return results;
    }

    const deliveryId = sendResult.details?.deliveryId;
    if (!deliveryId) {
      results.push({
        testName: "獲取交付 ID",
        success: false,
        duration: 0,
        error: "無法從發送結果中獲取交付 ID",
      });
      return results;
    }

    debug.info("KINDLE_TEST", `獲取到交付 ID: ${deliveryId}`);

    // 步驟 4: 測試狀態追蹤
    const trackingResult = await testDeliveryStatusTracking(deliveryId);
    results.push(trackingResult);

    // 步驟 5: 測試歷史查詢
    const historyResult = await testDeliveryHistory();
    results.push(historyResult);

    const totalDuration = Date.now() - startTime;
    debug.info("KINDLE_TEST", `${testName} 完成`, {
      totalDuration,
      totalTests: results.length,
      passedTests: results.filter((r) => r.success).length,
    });

    return results;
  } catch (error: any) {
    debug.error("KINDLE_TEST", `${testName} 異常`, { error });

    results.push({
      testName: "流程異常處理",
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
      details: { error },
    });

    return results;
  }
}

/**
 * 運行所有 Kindle 端到端測試
 */
export async function runE2EKindleTests(
  jobId?: string
): Promise<KindleTestStats> {
  const startTime = Date.now();
  const allResults: KindleTestResult[] = [];

  debug.info("KINDLE_TEST", "開始 Kindle 端到端測試");

  const testJobId = jobId || KINDLE_TEST_CONFIG.TEST_JOB_ID;

  try {
    const results = await testFullKindleFlow(testJobId);
    allResults.push(...results);
  } catch (error: any) {
    debug.error("KINDLE_TEST", `測試執行失敗`, { error });

    allResults.push({
      testName: "測試執行異常",
      success: false,
      duration: 0,
      error: error.message,
      details: { error, jobId: testJobId },
    });
  }

  const totalDuration = Date.now() - startTime;
  const stats: KindleTestStats = {
    total: allResults.length,
    passed: allResults.filter((r) => r.success).length,
    failed: allResults.filter((r) => !r.success).length,
    duration: totalDuration,
    results: allResults,
  };

  debug.info("KINDLE_TEST", "Kindle 端到端測試完成", stats);

  // 輸出測試報告
  console.group("📱 Kindle 功能端到端測試報告");
  console.log(`📊 測試統計:`);
  console.log(`   總測試數: ${stats.total}`);
  console.log(`   通過: ${stats.passed} ✅`);
  console.log(`   失敗: ${stats.failed} ❌`);
  console.log(`   成功率: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
  console.log(`   總耗時: ${(stats.duration / 1000).toFixed(1)}秒`);

  console.log(`\n📋 詳細結果:`);
  stats.results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    const duration = (result.duration / 1000).toFixed(1);
    console.log(`   ${index + 1}. ${status} ${result.testName} (${duration}s)`);
    if (!result.success && result.error) {
      console.log(`      錯誤: ${result.error}`);
    }
  });

  console.groupEnd();

  return stats;
}

/**
 * 快速測試 Kindle 功能
 */
export async function quickKindleTest(jobId?: string): Promise<void> {
  const testJobId = jobId || KINDLE_TEST_CONFIG.TEST_JOB_ID;
  debug.info("KINDLE_TEST", `快速 Kindle 測試: ${testJobId}`);

  const results = await testFullKindleFlow(testJobId);

  console.group(`🚀 快速 Kindle 測試結果 - ${testJobId}`);
  results.forEach((result) => {
    const status = result.success ? "✅" : "❌";
    const duration = (result.duration / 1000).toFixed(1);
    console.log(`${status} ${result.testName} (${duration}s)`);
    if (!result.success && result.error) {
      console.log(`   錯誤: ${result.error}`);
    }
  });
  console.groupEnd();
}

// 全域暴露測試函數（用於瀏覽器控制台）
if (typeof window !== "undefined") {
  (window as any).__SYOSETU_KINDLE_TESTS__ = {
    runAll: runE2EKindleTests,
    quickTest: quickKindleTest,
    testAuth: testUserAuthentication,
    testEmailSetup: testKindleEmailSetup,
    testSend: testSendToKindle,
    testTracking: testDeliveryStatusTracking,
    testHistory: testDeliveryHistory,
    config: KINDLE_TEST_CONFIG,
  };

  console.log("📱 Kindle 端到端測試工具已載入！");
  console.log("使用方式:");
  console.log("  __SYOSETU_KINDLE_TESTS__.runAll() - 運行完整 Kindle 測試");
  console.log(
    '  __SYOSETU_KINDLE_TESTS__.quickTest("jobId") - 快速測試指定任務'
  );
}

/**
 * 錯誤場景測試
 * 測試各種錯誤情況的處理，確保用戶體驗流暢
 *
 * 測試場景包括：
 * 1. 無效 URL 處理
 * 2. 網路錯誤處理
 * 3. 認證錯誤處理
 * 4. 伺服器錯誤處理
 * 5. 超時錯誤處理
 */

import { apiClient } from "@/lib/api-client";
import { debug } from "@/lib/debug.js";
import { handleError, ErrorType } from "@/lib/error-handler";
import type { PreviewNovelDto, ConvertNovelDto } from "@/lib/api-client";

// 錯誤測試配置
const ERROR_TEST_CONFIG = {
  // 無效的測試數據
  INVALID_DATA: {
    URLS: [
      "https://invalid-site.com/novel/123",
      "https://ncode.syosetu.com/invalid-id",
      "not-a-url",
      "",
      "https://ncode.syosetu.com/n999999999/", // 不存在的小說
    ],
    NOVEL_IDS: [
      "",
      "invalid-id",
      "non-existent-novel-id-12345",
      "   ", // 空白字符
      null as any,
      undefined as any,
    ],
    JOB_IDS: [
      "",
      "invalid-job-id",
      "non-existent-job-12345",
      "   ",
      null as any,
      undefined as any,
    ],
  },
  // 測試超時配置
  TIMEOUTS: {
    SHORT: 1000, // 1秒，用於測試超時
    NORMAL: 5000, // 5秒，正常超時
  },
};

// 錯誤測試結果
interface ErrorTestResult {
  testName: string;
  scenario: string;
  success: boolean;
  expectedError: boolean;
  actualError?: string;
  errorType?: ErrorType;
  duration: number;
  details?: any;
}

// 錯誤測試統計
interface ErrorTestStats {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: ErrorTestResult[];
  errorTypeStats: Record<ErrorType, number>;
}

/**
 * 帶超時的 Promise（用於測試超時場景）
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    ),
  ]);
}

/**
 * 測試無效 URL 預覽
 */
async function testInvalidUrlPreview(): Promise<ErrorTestResult[]> {
  const results: ErrorTestResult[] = [];

  for (const url of ERROR_TEST_CONFIG.INVALID_DATA.URLS) {
    const startTime = Date.now();
    const testName = `無效 URL 預覽測試`;
    const scenario = `URL: ${url || "(空字符串)"}`;

    debug.info("ERROR_TEST", `測試 ${testName} - ${scenario}`);

    try {
      // 嘗試解析 URL
      let source = "";
      let sourceId = "";

      if (url && typeof url === "string" && url.trim()) {
        try {
          const urlObj = new URL(url);
          if (urlObj.hostname.includes("syosetu.com")) {
            const match = urlObj.pathname.match(/\/([a-z0-9]+)\/?$/);
            if (match) {
              source = "narou";
              sourceId = match[1];
            }
          }
        } catch {
          // URL 解析失敗，這是預期的錯誤
        }
      }

      if (!source || !sourceId) {
        // 這是預期的錯誤情況
        const duration = Date.now() - startTime;
        results.push({
          testName,
          scenario,
          success: true, // 成功檢測到錯誤
          expectedError: true,
          actualError: "URL 解析失敗",
          errorType: ErrorType.VALIDATION,
          duration,
          details: { url, source, sourceId },
        });
        continue;
      }

      const requestData: PreviewNovelDto = { source, sourceId };

      const response = await withTimeout(
        apiClient.novels.preview(requestData),
        ERROR_TEST_CONFIG.TIMEOUTS.NORMAL
      );

      // 如果到這裡沒有錯誤，可能是意外成功
      const duration = Date.now() - startTime;
      results.push({
        testName,
        scenario,
        success: false, // 預期應該失敗但成功了
        expectedError: true,
        duration,
        details: { url, response },
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const standardError = handleError(error, {
        context: "測試無效 URL 預覽",
        showToast: false,
      });

      results.push({
        testName,
        scenario,
        success: true, // 成功捕獲預期錯誤
        expectedError: true,
        actualError: standardError.userMessage,
        errorType: standardError.type,
        duration,
        details: { url, error: error.message },
      });
    }
  }

  return results;
}

/**
 * 測試無效 novelId 轉換
 */
async function testInvalidNovelIdConversion(): Promise<ErrorTestResult[]> {
  const results: ErrorTestResult[] = [];

  for (const novelId of ERROR_TEST_CONFIG.INVALID_DATA.NOVEL_IDS) {
    const startTime = Date.now();
    const testName = `無效 novelId 轉換測試`;
    const scenario = `novelId: ${
      novelId === null
        ? "null"
        : novelId === undefined
        ? "undefined"
        : `"${novelId}"`
    }`;

    debug.info("ERROR_TEST", `測試 ${testName} - ${scenario}`);

    try {
      const requestData: ConvertNovelDto = {
        novelId: novelId as string,
        includeCover: true,
      };

      const response = await withTimeout(
        apiClient.conversions.create(requestData),
        ERROR_TEST_CONFIG.TIMEOUTS.NORMAL
      );

      // 如果到這裡沒有錯誤，可能是意外成功
      const duration = Date.now() - startTime;
      results.push({
        testName,
        scenario,
        success: false, // 預期應該失敗但成功了
        expectedError: true,
        duration,
        details: { novelId, response },
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const standardError = handleError(error, {
        context: "測試無效 novelId 轉換",
        showToast: false,
      });

      results.push({
        testName,
        scenario,
        success: true, // 成功捕獲預期錯誤
        expectedError: true,
        actualError: standardError.userMessage,
        errorType: standardError.type,
        duration,
        details: { novelId, error: error.message },
      });
    }
  }

  return results;
}

/**
 * 測試無效 jobId 狀態查詢
 */
async function testInvalidJobIdStatus(): Promise<ErrorTestResult[]> {
  const results: ErrorTestResult[] = [];

  for (const jobId of ERROR_TEST_CONFIG.INVALID_DATA.JOB_IDS) {
    const startTime = Date.now();
    const testName = `無效 jobId 狀態查詢測試`;
    const scenario = `jobId: ${
      jobId === null ? "null" : jobId === undefined ? "undefined" : `"${jobId}"`
    }`;

    debug.info("ERROR_TEST", `測試 ${testName} - ${scenario}`);

    try {
      const response = await withTimeout(
        apiClient.conversions.getStatus(jobId as string),
        ERROR_TEST_CONFIG.TIMEOUTS.NORMAL
      );

      // 如果到這裡沒有錯誤，可能是意外成功
      const duration = Date.now() - startTime;
      results.push({
        testName,
        scenario,
        success: false, // 預期應該失敗但成功了
        expectedError: true,
        duration,
        details: { jobId, response },
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const standardError = handleError(error, {
        context: "測試無效 jobId 狀態查詢",
        showToast: false,
      });

      results.push({
        testName,
        scenario,
        success: true, // 成功捕獲預期錯誤
        expectedError: true,
        actualError: standardError.userMessage,
        errorType: standardError.type,
        duration,
        details: { jobId, error: error.message },
      });
    }
  }

  return results;
}

/**
 * 測試網路超時場景
 */
async function testNetworkTimeout(): Promise<ErrorTestResult[]> {
  const results: ErrorTestResult[] = [];

  // 測試預覽請求超時
  const testCases = [
    {
      name: "預覽請求超時測試",
      action: () =>
        apiClient.novels.preview({ source: "narou", sourceId: "n9669bk" }),
    },
    {
      name: "轉換狀態查詢超時測試",
      action: () => apiClient.conversions.getStatus("test-job-id"),
    },
  ];

  for (const testCase of testCases) {
    const startTime = Date.now();
    const testName = testCase.name;
    const scenario = `超時時間: ${ERROR_TEST_CONFIG.TIMEOUTS.SHORT}ms`;

    debug.info("ERROR_TEST", `測試 ${testName} - ${scenario}`);

    try {
      // 使用很短的超時時間來模擬超時
      await withTimeout(testCase.action(), ERROR_TEST_CONFIG.TIMEOUTS.SHORT);

      // 如果沒有超時，記錄為意外成功
      const duration = Date.now() - startTime;
      results.push({
        testName,
        scenario,
        success: false, // 預期應該超時但沒有
        expectedError: true,
        duration,
        details: { timeoutMs: ERROR_TEST_CONFIG.TIMEOUTS.SHORT },
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (error.message === "TIMEOUT") {
        // 成功模擬超時
        results.push({
          testName,
          scenario,
          success: true,
          expectedError: true,
          actualError: "請求超時",
          errorType: ErrorType.TIMEOUT,
          duration,
          details: { timeoutMs: ERROR_TEST_CONFIG.TIMEOUTS.SHORT },
        });
      } else {
        // 其他錯誤
        const standardError = handleError(error, {
          context: testName,
          showToast: false,
        });

        results.push({
          testName,
          scenario,
          success: true,
          expectedError: true,
          actualError: standardError.userMessage,
          errorType: standardError.type,
          duration,
          details: { error: error.message },
        });
      }
    }
  }

  return results;
}

/**
 * 測試錯誤處理機制
 */
async function testErrorHandling(): Promise<ErrorTestResult[]> {
  const results: ErrorTestResult[] = [];

  // 測試不同類型的錯誤
  const errorScenarios = [
    {
      name: "網路錯誤處理",
      error: new Error("Network Error"),
      expectedType: ErrorType.NETWORK,
    },
    {
      name: "超時錯誤處理",
      error: { code: "ECONNABORTED", message: "timeout of 5000ms exceeded" },
      expectedType: ErrorType.TIMEOUT,
    },
    {
      name: "認證錯誤處理",
      error: { response: { status: 401, data: { message: "Unauthorized" } } },
      expectedType: ErrorType.AUTHENTICATION,
    },
    {
      name: "權限錯誤處理",
      error: { response: { status: 403, data: { message: "Forbidden" } } },
      expectedType: ErrorType.AUTHORIZATION,
    },
    {
      name: "驗證錯誤處理",
      error: { response: { status: 400, data: { message: "Bad Request" } } },
      expectedType: ErrorType.VALIDATION,
    },
    {
      name: "資源不存在錯誤處理",
      error: { response: { status: 404, data: { message: "Not Found" } } },
      expectedType: ErrorType.NOT_FOUND,
    },
    {
      name: "限流錯誤處理",
      error: {
        response: { status: 429, data: { message: "Too Many Requests" } },
      },
      expectedType: ErrorType.RATE_LIMIT,
    },
    {
      name: "伺服器錯誤處理",
      error: {
        response: { status: 500, data: { message: "Internal Server Error" } },
      },
      expectedType: ErrorType.SERVER_ERROR,
    },
  ];

  for (const scenario of errorScenarios) {
    const startTime = Date.now();
    const testName = scenario.name;
    const scenarioDesc = `錯誤類型: ${scenario.expectedType}`;

    debug.info("ERROR_TEST", `測試 ${testName} - ${scenarioDesc}`);

    try {
      const standardError = handleError(scenario.error, {
        context: testName,
        showToast: false,
      });

      const duration = Date.now() - startTime;
      const success = standardError.type === scenario.expectedType;

      results.push({
        testName,
        scenario: scenarioDesc,
        success,
        expectedError: true,
        actualError: standardError.userMessage,
        errorType: standardError.type,
        duration,
        details: {
          expectedType: scenario.expectedType,
          actualType: standardError.type,
          originalError: scenario.error,
        },
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      results.push({
        testName,
        scenario: scenarioDesc,
        success: false,
        expectedError: true,
        actualError: `錯誤處理函數異常: ${error.message}`,
        duration,
        details: { error: error.message },
      });
    }
  }

  return results;
}

/**
 * 運行所有錯誤場景測試
 */
export async function runErrorScenarioTests(): Promise<ErrorTestStats> {
  const startTime = Date.now();
  const allResults: ErrorTestResult[] = [];

  debug.info("ERROR_TEST", "開始錯誤場景測試");

  try {
    // 測試無效 URL 預覽
    debug.info("ERROR_TEST", "測試無效 URL 預覽場景");
    const invalidUrlResults = await testInvalidUrlPreview();
    allResults.push(...invalidUrlResults);

    // 測試無效 novelId 轉換
    debug.info("ERROR_TEST", "測試無效 novelId 轉換場景");
    const invalidNovelIdResults = await testInvalidNovelIdConversion();
    allResults.push(...invalidNovelIdResults);

    // 測試無效 jobId 狀態查詢
    debug.info("ERROR_TEST", "測試無效 jobId 狀態查詢場景");
    const invalidJobIdResults = await testInvalidJobIdStatus();
    allResults.push(...invalidJobIdResults);

    // 測試網路超時場景
    debug.info("ERROR_TEST", "測試網路超時場景");
    const timeoutResults = await testNetworkTimeout();
    allResults.push(...timeoutResults);

    // 測試錯誤處理機制
    debug.info("ERROR_TEST", "測試錯誤處理機制");
    const errorHandlingResults = await testErrorHandling();
    allResults.push(...errorHandlingResults);
  } catch (error: any) {
    debug.error("ERROR_TEST", "錯誤場景測試異常", { error });

    allResults.push({
      testName: "測試執行異常",
      scenario: "測試框架錯誤",
      success: false,
      expectedError: false,
      actualError: error.message,
      duration: 0,
      details: { error },
    });
  }

  const totalDuration = Date.now() - startTime;

  // 統計錯誤類型
  const errorTypeStats: Record<ErrorType, number> = {
    [ErrorType.NETWORK]: 0,
    [ErrorType.TIMEOUT]: 0,
    [ErrorType.AUTHENTICATION]: 0,
    [ErrorType.AUTHORIZATION]: 0,
    [ErrorType.VALIDATION]: 0,
    [ErrorType.NOT_FOUND]: 0,
    [ErrorType.RATE_LIMIT]: 0,
    [ErrorType.SERVER_ERROR]: 0,
    [ErrorType.UNKNOWN]: 0,
  };

  allResults.forEach((result) => {
    if (result.errorType) {
      errorTypeStats[result.errorType]++;
    }
  });

  const stats: ErrorTestStats = {
    total: allResults.length,
    passed: allResults.filter((r) => r.success).length,
    failed: allResults.filter((r) => !r.success).length,
    duration: totalDuration,
    results: allResults,
    errorTypeStats,
  };

  debug.info("ERROR_TEST", "錯誤場景測試完成", stats);

  // 輸出測試報告
  console.group("🚨 錯誤場景測試報告");
  console.log(`📊 測試統計:`);
  console.log(`   總測試數: ${stats.total}`);
  console.log(`   通過: ${stats.passed} ✅`);
  console.log(`   失敗: ${stats.failed} ❌`);
  console.log(`   成功率: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
  console.log(`   總耗時: ${(stats.duration / 1000).toFixed(1)}秒`);

  console.log(`\n🏷️ 錯誤類型統計:`);
  Object.entries(errorTypeStats).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`   ${type}: ${count}`);
    }
  });

  console.log(`\n📋 詳細結果:`);
  stats.results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    const duration = (result.duration / 1000).toFixed(1);
    console.log(`   ${index + 1}. ${status} ${result.testName} (${duration}s)`);
    console.log(`      場景: ${result.scenario}`);
    if (result.actualError) {
      console.log(`      錯誤: ${result.actualError}`);
    }
    if (result.errorType) {
      console.log(`      類型: ${result.errorType}`);
    }
  });

  console.groupEnd();

  return stats;
}

// 全域暴露測試函數（用於瀏覽器控制台）
if (typeof window !== "undefined") {
  (window as any).__SYOSETU_ERROR_TESTS__ = {
    runAll: runErrorScenarioTests,
    testInvalidUrl: testInvalidUrlPreview,
    testInvalidNovelId: testInvalidNovelIdConversion,
    testInvalidJobId: testInvalidJobIdStatus,
    testTimeout: testNetworkTimeout,
    testErrorHandling: testErrorHandling,
    config: ERROR_TEST_CONFIG,
  };

  console.log("🚨 錯誤場景測試工具已載入！");
  console.log("使用方式:");
  console.log("  __SYOSETU_ERROR_TESTS__.runAll() - 運行所有錯誤場景測試");
}

/**
 * 端到端轉換功能測試
 * 測試完整的轉換流程：提交 → 輪詢 → 完成
 *
 * 使用方式：
 * 1. 在瀏覽器控制台中運行此腳本
 * 2. 或在開發環境中導入並執行測試函數
 */

import { apiClient } from "@/lib/api-client";
import { debug } from "@/lib/debug.js";
import type {
  PreviewNovelDto,
  ConvertNovelDto,
  ConversionStatusResponse,
} from "@/lib/api-client";

// 測試配置
const TEST_CONFIG = {
  // 測試用的小說 URL（小說家になろう的短篇小說）
  TEST_URLS: [
    "https://ncode.syosetu.com/n9669bk/", // 短篇測試小說
    "https://ncode.syosetu.com/n4830bu/", // 另一個短篇測試小說
  ],
  // 輪詢配置
  POLLING: {
    MAX_ATTEMPTS: 60, // 最大輪詢次數（5分鐘）
    INTERVAL: 5000, // 輪詢間隔（5秒）
    TIMEOUT: 300000, // 總超時時間（5分鐘）
  },
  // 測試超時配置
  TIMEOUTS: {
    PREVIEW: 30000, // 預覽請求超時（30秒）
    CONVERSION: 10000, // 轉換提交超時（10秒）
    STATUS: 5000, // 狀態查詢超時（5秒）
  },
};

// 測試結果接口
interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

// 測試統計
interface TestStats {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

/**
 * 解析小說 URL 獲取 source 和 sourceId
 */
function parseNovelUrl(
  url: string
): { source: string; sourceId: string } | null {
  try {
    const urlObj = new URL(url);

    // 小說家になろう
    if (urlObj.hostname.includes("syosetu.com")) {
      const match = urlObj.pathname.match(/\/([a-z0-9]+)\/?$/);
      if (match) {
        return {
          source: "narou",
          sourceId: match[1],
        };
      }
    }

    // カクヨム
    if (urlObj.hostname.includes("kakuyomu.jp")) {
      const match = urlObj.pathname.match(/\/works\/(\d+)/);
      if (match) {
        return {
          source: "kakuyomu",
          sourceId: match[1],
        };
      }
    }

    return null;
  } catch (error) {
    console.error("URL 解析失敗:", error);
    return null;
  }
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
 * 測試小說預覽功能
 */
async function testNovelPreview(url: string): Promise<TestResult> {
  const startTime = Date.now();
  const testName = `預覽測試 - ${url}`;

  debug.info("E2E_TEST", `開始 ${testName}`);

  try {
    const parsed = parseNovelUrl(url);
    if (!parsed) {
      throw new Error("無法解析小說 URL");
    }

    const requestData: PreviewNovelDto = {
      source: parsed.source,
      sourceId: parsed.sourceId,
    };

    debug.debug("E2E_TEST", "發送預覽請求", { requestData });

    const response = await withTimeout(
      apiClient.novels.preview(requestData),
      TEST_CONFIG.TIMEOUTS.PREVIEW,
      "預覽請求超時"
    );

    debug.debug("E2E_TEST", "預覽響應", { response });

    // 驗證響應格式
    if (!response || typeof response !== "object") {
      throw new Error("預覽響應格式無效");
    }

    // 檢查是否有預覽數據或任務 ID
    const hasPreview = !!(response.data?.preview || (response as any).preview);
    const hasJobId = !!(response.data?.jobId || (response as any).jobId);
    const isCached = !!(response.data?.cached || (response as any).cached);

    if (!hasPreview && !hasJobId) {
      throw new Error("預覽響應中缺少預覽數據和任務 ID");
    }

    const duration = Date.now() - startTime;
    debug.info("E2E_TEST", `${testName} 成功`, {
      duration,
      hasPreview,
      hasJobId,
      isCached,
    });

    return {
      testName,
      success: true,
      duration,
      details: {
        hasPreview,
        hasJobId,
        isCached,
        response: response,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("E2E_TEST", `${testName} 失敗`, { error, duration });

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
 * 測試轉換任務提交
 */
async function testConversionSubmit(novelId: string): Promise<TestResult> {
  const startTime = Date.now();
  const testName = `轉換提交測試 - ${novelId}`;

  debug.info("E2E_TEST", `開始 ${testName}`);

  try {
    const requestData: ConvertNovelDto = {
      novelId,
      includeCover: true,
    };

    debug.debug("E2E_TEST", "發送轉換請求", { requestData });

    const response = await withTimeout(
      apiClient.conversions.create(requestData),
      TEST_CONFIG.TIMEOUTS.CONVERSION,
      "轉換提交超時"
    );

    debug.debug("E2E_TEST", "轉換響應", { response });

    // 驗證響應格式
    if (!response || !response.success) {
      throw new Error(`轉換提交失敗: ${response?.message || "未知錯誤"}`);
    }

    const jobId = response.data?.jobId || (response as any).jobId;
    if (!jobId) {
      throw new Error("轉換響應中缺少任務 ID");
    }

    const duration = Date.now() - startTime;
    debug.info("E2E_TEST", `${testName} 成功`, { duration, jobId });

    return {
      testName,
      success: true,
      duration,
      details: {
        jobId,
        response,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("E2E_TEST", `${testName} 失敗`, { error, duration });

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
 * 測試轉換狀態輪詢
 */
async function testConversionPolling(jobId: string): Promise<TestResult> {
  const startTime = Date.now();
  const testName = `轉換輪詢測試 - ${jobId}`;

  debug.info("E2E_TEST", `開始 ${testName}`);

  try {
    let attempts = 0;
    let lastStatus = "unknown";
    const statusHistory: string[] = [];

    while (attempts < TEST_CONFIG.POLLING.MAX_ATTEMPTS) {
      attempts++;

      debug.debug(
        "E2E_TEST",
        `輪詢嘗試 ${attempts}/${TEST_CONFIG.POLLING.MAX_ATTEMPTS}`,
        { jobId }
      );

      const response = await withTimeout(
        apiClient.conversions.getStatus(jobId),
        TEST_CONFIG.TIMEOUTS.STATUS,
        "狀態查詢超時"
      );

      debug.debug("E2E_TEST", `狀態響應 ${attempts}`, { response });

      // 解析狀態 - 正確處理 API 響應類型
      let statusData: any;
      if ("data" in response && response.data) {
        // 統一格式：ApiResponse<ConversionStatusResponse>
        statusData = response.data;
      } else {
        // 直接格式：ConversionStatusResponse
        statusData = response;
      }

      const status = statusData?.status?.toLowerCase() || "unknown";
      const publicUrl = statusData?.publicUrl;

      if (status !== lastStatus) {
        statusHistory.push(status);
        lastStatus = status;
        debug.info("E2E_TEST", `狀態變更: ${status}`, { jobId, attempts });
      }

      // 檢查終止狀態
      if (status === "completed") {
        if (!publicUrl) {
          throw new Error("轉換完成但缺少下載連結");
        }

        const duration = Date.now() - startTime;
        debug.info("E2E_TEST", `${testName} 成功完成`, {
          duration,
          attempts,
          statusHistory,
          publicUrl,
        });

        return {
          testName,
          success: true,
          duration,
          details: {
            attempts,
            statusHistory,
            publicUrl,
            finalStatus: status,
          },
        };
      }

      if (status === "failed" || status === "cancelled") {
        throw new Error(`轉換失敗，最終狀態: ${status}`);
      }

      // 等待下次輪詢
      if (attempts < TEST_CONFIG.POLLING.MAX_ATTEMPTS) {
        await sleep(TEST_CONFIG.POLLING.INTERVAL);
      }
    }

    // 超過最大嘗試次數
    throw new Error(`輪詢超時，最後狀態: ${lastStatus}，嘗試次數: ${attempts}`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("E2E_TEST", `${testName} 失敗`, { error, duration });

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
 * 測試完整的轉換流程
 */
async function testFullConversionFlow(url: string): Promise<TestResult[]> {
  const testName = `完整轉換流程測試 - ${url}`;
  const startTime = Date.now();
  const results: TestResult[] = [];

  debug.info("E2E_TEST", `開始 ${testName}`);

  try {
    // 步驟 1: 測試預覽
    const previewResult = await testNovelPreview(url);
    results.push(previewResult);

    if (!previewResult.success) {
      debug.error("E2E_TEST", "預覽測試失敗，跳過後續測試");
      return results;
    }

    // 從預覽結果中獲取 novelId
    const previewData =
      previewResult.details?.response?.data || previewResult.details?.response;
    const novelId = previewData?.preview?.novelId || previewData?.novelId;

    if (!novelId) {
      results.push({
        testName: "獲取 novelId",
        success: false,
        duration: 0,
        error: "無法從預覽結果中獲取 novelId",
      });
      return results;
    }

    debug.info("E2E_TEST", `獲取到 novelId: ${novelId}`);

    // 步驟 2: 測試轉換提交
    const submitResult = await testConversionSubmit(novelId);
    results.push(submitResult);

    if (!submitResult.success) {
      debug.error("E2E_TEST", "轉換提交失敗，跳過輪詢測試");
      return results;
    }

    const jobId = submitResult.details?.jobId;
    if (!jobId) {
      results.push({
        testName: "獲取 jobId",
        success: false,
        duration: 0,
        error: "無法從提交結果中獲取 jobId",
      });
      return results;
    }

    debug.info("E2E_TEST", `獲取到 jobId: ${jobId}`);

    // 步驟 3: 測試狀態輪詢
    const pollingResult = await testConversionPolling(jobId);
    results.push(pollingResult);

    const totalDuration = Date.now() - startTime;
    debug.info("E2E_TEST", `${testName} 完成`, {
      totalDuration,
      totalTests: results.length,
      passedTests: results.filter((r) => r.success).length,
    });

    return results;
  } catch (error: any) {
    debug.error("E2E_TEST", `${testName} 異常`, { error });

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
 * 運行所有端到端測試
 */
export async function runE2EConversionTests(): Promise<TestStats> {
  const startTime = Date.now();
  const allResults: TestResult[] = [];

  debug.info("E2E_TEST", "開始端到端轉換功能測試");

  // 測試每個 URL
  for (const url of TEST_CONFIG.TEST_URLS) {
    debug.info("E2E_TEST", `測試 URL: ${url}`);

    try {
      const results = await testFullConversionFlow(url);
      allResults.push(...results);
    } catch (error: any) {
      debug.error("E2E_TEST", `測試 URL 失敗: ${url}`, { error });

      allResults.push({
        testName: `URL 測試異常 - ${url}`,
        success: false,
        duration: 0,
        error: error.message,
        details: { error, url },
      });
    }

    // 測試間隔，避免過於頻繁的請求
    if (url !== TEST_CONFIG.TEST_URLS[TEST_CONFIG.TEST_URLS.length - 1]) {
      debug.info("E2E_TEST", "等待測試間隔...");
      await sleep(3000);
    }
  }

  const totalDuration = Date.now() - startTime;
  const stats: TestStats = {
    total: allResults.length,
    passed: allResults.filter((r) => r.success).length,
    failed: allResults.filter((r) => !r.success).length,
    duration: totalDuration,
    results: allResults,
  };

  debug.info("E2E_TEST", "端到端測試完成", stats);

  // 輸出測試報告
  console.group("🧪 端到端轉換功能測試報告");
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
 * 快速測試單個 URL
 */
export async function quickTest(url: string): Promise<void> {
  debug.info("E2E_TEST", `快速測試: ${url}`);

  const results = await testFullConversionFlow(url);

  console.group(`🚀 快速測試結果 - ${url}`);
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
  (window as any).__SYOSETU_E2E_TESTS__ = {
    runAll: runE2EConversionTests,
    quickTest,
    testPreview: testNovelPreview,
    testSubmit: testConversionSubmit,
    testPolling: testConversionPolling,
    config: TEST_CONFIG,
  };

  console.log("🧪 端到端測試工具已載入！");
  console.log("使用方式:");
  console.log("  __SYOSETU_E2E_TESTS__.runAll() - 運行完整測試");
  console.log('  __SYOSETU_E2E_TESTS__.quickTest("URL") - 快速測試單個 URL');
}

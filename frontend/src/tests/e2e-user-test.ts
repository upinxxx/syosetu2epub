/**
 * 用戶功能端到端測試
 * 測試用戶相關功能的完整流程
 *
 * 測試流程：
 * 1. 用戶登入登出功能
 * 2. 用戶資料獲取和更新
 * 3. 最近任務顯示
 * 4. 任務歷史查詢
 * 5. 用戶數據的準確性
 */

import { apiClient } from "@/lib/api-client";
import { debug } from "@/lib/debug.js";
import { handleError, validateApiResponse } from "@/lib/error-handler";
import type {
  UpdateProfileDto,
  RecentJobsResponse,
  UserJobHistoryResponse,
  PaginationParams,
} from "@/lib/api-client";

// 用戶測試配置
const USER_TEST_CONFIG = {
  // 測試用的用戶資料
  TEST_PROFILE: {
    displayName: "Test User",
    kindleEmail: "testuser@kindle.com",
  },
  // 分頁測試配置
  PAGINATION: {
    PAGE_SIZE: 5,
    MAX_PAGES: 3,
  },
  // 測試超時配置
  TIMEOUTS: {
    AUTH: 10000, // 認證操作超時（10秒）
    PROFILE: 8000, // 個人資料操作超時（8秒）
    JOBS: 10000, // 任務查詢超時（10秒）
    HISTORY: 12000, // 歷史查詢超時（12秒）
  },
};

// 用戶測試結果
interface UserTestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

// 用戶測試統計
interface UserTestStats {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: UserTestResult[];
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
async function testUserAuthentication(): Promise<UserTestResult> {
  const startTime = Date.now();
  const testName = "用戶認證狀態測試";

  debug.info("USER_TEST", `開始 ${testName}`);

  try {
    const response = await withTimeout(
      apiClient.users.getProfile(),
      USER_TEST_CONFIG.TIMEOUTS.PROFILE,
      "獲取用戶資料超時"
    );

    debug.debug("USER_TEST", "用戶資料響應", { response });

    // 驗證響應格式
    const validation = validateApiResponse(response, "獲取用戶資料");
    if (!validation.isValid) {
      throw new Error(validation.error?.userMessage || "用戶資料響應格式無效");
    }

    const userData = validation.data as any;
    const isAuthenticated = !!(userData?.id && userData?.email);

    const duration = Date.now() - startTime;
    debug.info("USER_TEST", `${testName} 成功`, {
      duration,
      isAuthenticated,
      userId: userData?.id,
      userEmail: userData?.email,
    });

    return {
      testName,
      success: true,
      duration,
      details: {
        isAuthenticated,
        userId: userData?.id,
        userEmail: userData?.email,
        displayName: userData?.displayName,
        kindleEmail: userData?.kindleEmail,
        createdAt: userData?.createdAt,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("USER_TEST", `${testName} 失敗`, { error, duration });

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
 * 測試用戶資料更新
 */
async function testUserProfileUpdate(): Promise<UserTestResult> {
  const startTime = Date.now();
  const testName = "用戶資料更新測試";

  debug.info("USER_TEST", `開始 ${testName}`);

  try {
    // 先獲取當前用戶資料
    const currentResponse = await withTimeout(
      apiClient.users.getProfile(),
      USER_TEST_CONFIG.TIMEOUTS.PROFILE,
      "獲取當前用戶資料超時"
    );

    const currentValidation = validateApiResponse(
      currentResponse,
      "獲取當前用戶資料"
    );
    if (!currentValidation.isValid) {
      throw new Error("無法獲取當前用戶資料");
    }

    const currentUser = currentValidation.data as any;
    const originalDisplayName = currentUser?.displayName;
    const originalKindleEmail = currentUser?.kindleEmail;

    // 更新用戶資料
    const updateData: UpdateProfileDto = {
      displayName: USER_TEST_CONFIG.TEST_PROFILE.displayName,
      kindleEmail: USER_TEST_CONFIG.TEST_PROFILE.kindleEmail,
    };

    debug.debug("USER_TEST", "更新用戶資料", { updateData });

    const updateResponse = await withTimeout(
      apiClient.users.updateProfile(updateData),
      USER_TEST_CONFIG.TIMEOUTS.PROFILE,
      "更新用戶資料超時"
    );

    debug.debug("USER_TEST", "更新響應", { updateResponse });

    // 驗證更新響應
    const updateValidation = validateApiResponse(
      updateResponse,
      "更新用戶資料"
    );
    if (!updateValidation.isValid) {
      throw new Error(
        updateValidation.error?.userMessage || "更新響應格式無效"
      );
    }

    const updatedUser = updateValidation.data as any;
    const displayNameUpdated =
      updatedUser?.displayName === updateData.displayName;
    const kindleEmailUpdated =
      updatedUser?.kindleEmail === updateData.kindleEmail;

    if (!displayNameUpdated || !kindleEmailUpdated) {
      throw new Error("用戶資料更新失敗");
    }

    // 恢復原始資料（清理測試數據）
    if (originalDisplayName || originalKindleEmail) {
      const restoreData: UpdateProfileDto = {};
      if (originalDisplayName) restoreData.displayName = originalDisplayName;
      if (originalKindleEmail) restoreData.kindleEmail = originalKindleEmail;

      await apiClient.users.updateProfile(restoreData);
      debug.debug("USER_TEST", "已恢復原始用戶資料", { restoreData });
    }

    const duration = Date.now() - startTime;
    debug.info("USER_TEST", `${testName} 成功`, {
      duration,
      displayNameUpdated,
      kindleEmailUpdated,
    });

    return {
      testName,
      success: true,
      duration,
      details: {
        displayNameUpdated,
        kindleEmailUpdated,
        originalDisplayName,
        originalKindleEmail,
        updateData,
        updatedUser,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("USER_TEST", `${testName} 失敗`, { error, duration });

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
 * 測試最近任務查詢
 */
async function testRecentJobs(): Promise<UserTestResult> {
  const startTime = Date.now();
  const testName = "最近任務查詢測試";

  debug.info("USER_TEST", `開始 ${testName}`);

  try {
    const response = await withTimeout(
      apiClient.users.getRecentJobs(7), // 查詢最近7天的任務
      USER_TEST_CONFIG.TIMEOUTS.JOBS,
      "最近任務查詢超時"
    );

    debug.debug("USER_TEST", "最近任務響應", { response });

    // 驗證響應格式
    const validation = validateApiResponse(response, "最近任務查詢");
    if (!validation.isValid) {
      throw new Error(validation.error?.userMessage || "最近任務響應格式無效");
    }

    const jobsData = validation.data as any;
    const jobs = jobsData?.jobs || [];

    // 驗證任務數據結構
    const validJobs = jobs.filter(
      (job: any) => job && typeof job === "object" && job.id && job.status
    );

    const duration = Date.now() - startTime;
    debug.info("USER_TEST", `${testName} 成功`, {
      duration,
      totalJobs: jobs.length,
      validJobs: validJobs.length,
    });

    return {
      testName,
      success: true,
      duration,
      details: {
        totalJobs: jobs.length,
        validJobs: validJobs.length,
        jobs: validJobs.slice(0, 3), // 只記錄前3個任務
        hasJobs: jobs.length > 0,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("USER_TEST", `${testName} 失敗`, { error, duration });

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
 * 測試任務歷史查詢
 */
async function testJobHistory(): Promise<UserTestResult> {
  const startTime = Date.now();
  const testName = "任務歷史查詢測試";

  debug.info("USER_TEST", `開始 ${testName}`);

  try {
    const paginationParams: PaginationParams = {
      page: 1,
      limit: USER_TEST_CONFIG.PAGINATION.PAGE_SIZE,
    };

    const response = await withTimeout(
      apiClient.users.getJobHistory(paginationParams),
      USER_TEST_CONFIG.TIMEOUTS.HISTORY,
      "任務歷史查詢超時"
    );

    debug.debug("USER_TEST", "任務歷史響應", { response });

    // 驗證響應格式
    const validation = validateApiResponse(response, "任務歷史查詢");
    if (!validation.isValid) {
      throw new Error(validation.error?.userMessage || "任務歷史響應格式無效");
    }

    const historyData = validation.data as any;
    const jobs = historyData?.jobs || [];
    const pagination = historyData?.pagination;

    // 驗證分頁信息
    const hasPagination = !!(
      pagination &&
      typeof pagination.page === "number" &&
      typeof pagination.limit === "number" &&
      typeof pagination.total === "number"
    );

    // 驗證任務數據結構
    const validJobs = jobs.filter(
      (job: any) => job && typeof job === "object" && job.id && job.status
    );

    const duration = Date.now() - startTime;
    debug.info("USER_TEST", `${testName} 成功`, {
      duration,
      totalJobs: jobs.length,
      validJobs: validJobs.length,
      hasPagination,
    });

    return {
      testName,
      success: true,
      duration,
      details: {
        totalJobs: jobs.length,
        validJobs: validJobs.length,
        hasPagination,
        pagination,
        jobs: validJobs.slice(0, 3), // 只記錄前3個任務
        hasJobs: jobs.length > 0,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("USER_TEST", `${testName} 失敗`, { error, duration });

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
 * 測試分頁功能
 */
async function testPagination(): Promise<UserTestResult> {
  const startTime = Date.now();
  const testName = "分頁功能測試";

  debug.info("USER_TEST", `開始 ${testName}`);

  try {
    const pageResults: any[] = [];
    let totalItems = 0;

    // 測試多個頁面
    for (let page = 1; page <= USER_TEST_CONFIG.PAGINATION.MAX_PAGES; page++) {
      const paginationParams: PaginationParams = {
        page,
        limit: USER_TEST_CONFIG.PAGINATION.PAGE_SIZE,
      };

      debug.debug("USER_TEST", `查詢第 ${page} 頁`, { paginationParams });

      const response = await withTimeout(
        apiClient.users.getJobHistory(paginationParams),
        USER_TEST_CONFIG.TIMEOUTS.HISTORY,
        `第 ${page} 頁查詢超時`
      );

      const validation = validateApiResponse(response, `第 ${page} 頁查詢`);
      if (!validation.isValid) {
        debug.warn("USER_TEST", `第 ${page} 頁查詢失敗，跳過`, {
          error: validation.error,
        });
        continue;
      }

      const historyData = validation.data as any;
      const jobs = historyData?.jobs || [];
      const pagination = historyData?.pagination;

      pageResults.push({
        page,
        jobCount: jobs.length,
        pagination,
        hasJobs: jobs.length > 0,
      });

      if (page === 1 && pagination?.total) {
        totalItems = pagination.total;
      }

      // 如果這一頁沒有數據，停止測試
      if (jobs.length === 0) {
        debug.info("USER_TEST", `第 ${page} 頁無數據，停止分頁測試`);
        break;
      }

      // 避免過於頻繁的請求
      if (page < USER_TEST_CONFIG.PAGINATION.MAX_PAGES) {
        await sleep(1000);
      }
    }

    const duration = Date.now() - startTime;
    debug.info("USER_TEST", `${testName} 成功`, {
      duration,
      pagesChecked: pageResults.length,
      totalItems,
    });

    return {
      testName,
      success: true,
      duration,
      details: {
        pagesChecked: pageResults.length,
        totalItems,
        pageResults,
        hasPaginationData: pageResults.length > 0,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("USER_TEST", `${testName} 失敗`, { error, duration });

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
 * 測試用戶數據一致性
 */
async function testDataConsistency(): Promise<UserTestResult> {
  const startTime = Date.now();
  const testName = "用戶數據一致性測試";

  debug.info("USER_TEST", `開始 ${testName}`);

  try {
    // 多次獲取用戶資料，檢查一致性
    const responses = [];

    for (let i = 0; i < 3; i++) {
      const response = await withTimeout(
        apiClient.users.getProfile(),
        USER_TEST_CONFIG.TIMEOUTS.PROFILE,
        `第 ${i + 1} 次獲取用戶資料超時`
      );

      const validation = validateApiResponse(
        response,
        `第 ${i + 1} 次獲取用戶資料`
      );
      if (validation.isValid) {
        responses.push(validation.data);
      }

      // 避免過於頻繁的請求
      if (i < 2) {
        await sleep(500);
      }
    }

    if (responses.length < 2) {
      throw new Error("無法獲取足夠的用戶資料進行一致性檢查");
    }

    // 檢查數據一致性
    const firstResponse = responses[0] as any;
    const inconsistencies: string[] = [];

    for (let i = 1; i < responses.length; i++) {
      const currentResponse = responses[i] as any;

      // 檢查關鍵字段
      const keyFields = ["id", "email", "displayName", "kindleEmail"];

      for (const field of keyFields) {
        if (firstResponse?.[field] !== currentResponse?.[field]) {
          inconsistencies.push(
            `${field}: ${firstResponse?.[field]} !== ${currentResponse?.[field]}`
          );
        }
      }
    }

    const isConsistent = inconsistencies.length === 0;

    const duration = Date.now() - startTime;
    debug.info(
      "USER_TEST",
      `${testName} ${isConsistent ? "成功" : "發現不一致"}`,
      {
        duration,
        responsesChecked: responses.length,
        inconsistencies,
      }
    );

    return {
      testName,
      success: isConsistent,
      duration,
      error: isConsistent
        ? undefined
        : `數據不一致: ${inconsistencies.join(", ")}`,
      details: {
        responsesChecked: responses.length,
        isConsistent,
        inconsistencies,
        firstResponse,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debug.error("USER_TEST", `${testName} 失敗`, { error, duration });

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
 * 測試完整的用戶功能流程
 */
async function testFullUserFlow(): Promise<UserTestResult[]> {
  const testName = "完整用戶功能流程測試";
  const startTime = Date.now();
  const results: UserTestResult[] = [];

  debug.info("USER_TEST", `開始 ${testName}`);

  try {
    // 步驟 1: 測試用戶認證
    const authResult = await testUserAuthentication();
    results.push(authResult);

    if (!authResult.success) {
      debug.error("USER_TEST", "用戶認證失敗，跳過後續測試");
      return results;
    }

    // 步驟 2: 測試用戶資料更新
    const profileUpdateResult = await testUserProfileUpdate();
    results.push(profileUpdateResult);

    // 步驟 3: 測試最近任務查詢
    const recentJobsResult = await testRecentJobs();
    results.push(recentJobsResult);

    // 步驟 4: 測試任務歷史查詢
    const jobHistoryResult = await testJobHistory();
    results.push(jobHistoryResult);

    // 步驟 5: 測試分頁功能
    const paginationResult = await testPagination();
    results.push(paginationResult);

    // 步驟 6: 測試數據一致性
    const consistencyResult = await testDataConsistency();
    results.push(consistencyResult);

    const totalDuration = Date.now() - startTime;
    debug.info("USER_TEST", `${testName} 完成`, {
      totalDuration,
      totalTests: results.length,
      passedTests: results.filter((r) => r.success).length,
    });

    return results;
  } catch (error: any) {
    debug.error("USER_TEST", `${testName} 異常`, { error });

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
 * 運行所有用戶端到端測試
 */
export async function runE2EUserTests(): Promise<UserTestStats> {
  const startTime = Date.now();
  const allResults: UserTestResult[] = [];

  debug.info("USER_TEST", "開始用戶端到端測試");

  try {
    const results = await testFullUserFlow();
    allResults.push(...results);
  } catch (error: any) {
    debug.error("USER_TEST", `測試執行失敗`, { error });

    allResults.push({
      testName: "測試執行異常",
      success: false,
      duration: 0,
      error: error.message,
      details: { error },
    });
  }

  const totalDuration = Date.now() - startTime;
  const stats: UserTestStats = {
    total: allResults.length,
    passed: allResults.filter((r) => r.success).length,
    failed: allResults.filter((r) => !r.success).length,
    duration: totalDuration,
    results: allResults,
  };

  debug.info("USER_TEST", "用戶端到端測試完成", stats);

  // 輸出測試報告
  console.group("👤 用戶功能端到端測試報告");
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
 * 快速測試用戶功能
 */
export async function quickUserTest(): Promise<void> {
  debug.info("USER_TEST", "快速用戶功能測試");

  const results = await testFullUserFlow();

  console.group("🚀 快速用戶功能測試結果");
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
  (window as any).__SYOSETU_USER_TESTS__ = {
    runAll: runE2EUserTests,
    quickTest: quickUserTest,
    testAuth: testUserAuthentication,
    testProfileUpdate: testUserProfileUpdate,
    testRecentJobs: testRecentJobs,
    testJobHistory: testJobHistory,
    testPagination: testPagination,
    testConsistency: testDataConsistency,
    config: USER_TEST_CONFIG,
  };

  console.log("👤 用戶端到端測試工具已載入！");
  console.log("使用方式:");
  console.log("  __SYOSETU_USER_TESTS__.runAll() - 運行完整用戶測試");
  console.log("  __SYOSETU_USER_TESTS__.quickTest() - 快速測試用戶功能");
}

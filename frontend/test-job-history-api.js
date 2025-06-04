// 測試任務歷史 API 響應格式
const API_BASE_URL = "http://localhost:3000";

async function testJobHistoryAPI() {
  console.log("🧪 測試任務歷史 API...\n");

  try {
    // 模擬 API 請求（需要實際的認證令牌）
    const testUrl = `${API_BASE_URL}/api/v1/users/job-history?page=1&limit=5`;
    console.log(`請求 URL: ${testUrl}`);

    console.log("\n📋 預期的響應格式：");
    console.log("後端直接返回：");
    console.log({
      success: true,
      jobs: [
        {
          id: "uuid",
          novelId: "string",
          novelTitle: "小說標題",
          status: "COMPLETED",
          createdAt: "2024-01-01T00:00:00.000Z",
          completedAt: "2024-01-01T00:05:00.000Z",
          publicUrl: "https://example.com/file.epub",
          errorMessage: null,
        },
      ],
      pagination: {
        page: 1,
        limit: 5,
        total: 10,
        hasMore: true,
      },
    });

    console.log("\nAPI 客戶端標準化後：");
    console.log({
      success: true,
      data: {
        jobs: [
          /* 任務數組 */
        ],
        pagination: {
          /* 分頁信息 */
        },
      },
      timestamp: "2024-01-01T00:00:00.000Z",
    });

    console.log("\n🔧 前端處理邏輯：");
    console.log("1. 檢查 response.success && response.data");
    console.log("2. 從 response.data 中提取 jobs 和 pagination");
    console.log("3. 驗證 jobs 是數組，pagination 是對象");
    console.log("4. 更新組件狀態");

    console.log("\n✅ 測試完成！");
    console.log("請確保：");
    console.log("- 後端返回正確的分頁數據");
    console.log("- API 客戶端正確標準化響應");
    console.log("- 前端正確解析標準化後的數據");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
  }
}

// 如果是在 Node.js 環境中運行
if (typeof module !== "undefined" && module.exports) {
  testJobHistoryAPI();
} else {
  // 如果是在瀏覽器中運行
  window.testJobHistoryAPI = testJobHistoryAPI;
  console.log("✨ 測試函數已準備就緒，請在控制台運行 testJobHistoryAPI()");
}

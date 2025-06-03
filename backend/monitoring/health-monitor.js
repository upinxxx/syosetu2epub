#!/usr/bin/env node

/**
 * Syosetu2EPUB 健康監控腳本
 * 版本: 1.0.0
 * 用途: 外部監控系統調用，檢查應用健康狀態
 * 支援: Uptime Kuma, Prometheus, Grafana 等監控系統
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置
const config = {
  // 應用 URL（從環境變數或預設值獲取）
  baseUrl: process.env.MONITOR_BASE_URL || 'http://localhost:3000',

  // 超時設定（毫秒）
  timeout: parseInt(process.env.MONITOR_TIMEOUT) || 10000,

  // 告警閾值
  thresholds: {
    // 回應時間閾值（毫秒）
    responseTime: parseInt(process.env.MONITOR_RESPONSE_TIME_THRESHOLD) || 5000,
    // 記憶體使用率閾值（%）
    memoryUsage: parseInt(process.env.MONITOR_MEMORY_THRESHOLD) || 85,
    // 數據一致性問題閾值
    inconsistentJobs:
      parseInt(process.env.MONITOR_INCONSISTENT_JOBS_THRESHOLD) || 5,
  },

  // 輸出格式：json, prometheus, simple
  outputFormat: process.env.MONITOR_OUTPUT_FORMAT || 'simple',

  // 詳細模式
  verbose: process.env.MONITOR_VERBOSE === 'true',
};

// 監控結果狀態
const STATUS = {
  OK: 'OK',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  UNKNOWN: 'UNKNOWN',
};

// 日誌函數
const log = {
  info: (msg) => config.verbose && console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

/**
 * 執行 HTTP 請求
 */
async function makeRequest(endpoint, timeout = config.timeout) {
  const url = `${config.baseUrl}${endpoint}`;
  const startTime = Date.now();

  log.info(`發送請求到: ${url}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Syosetu2EPUB-Monitor/1.0.0',
      },
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    return {
      success: response.ok,
      status: response.status,
      responseTime,
      data,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error.name === 'AbortError') {
      throw new Error(`請求超時 (${timeout}ms)`);
    }

    throw new Error(`請求失敗: ${error.message}`);
  }
}

/**
 * 基本健康檢查
 */
async function checkBasicHealth() {
  log.info('執行基本健康檢查...');

  try {
    const result = await makeRequest('/health/quick');

    if (!result.success) {
      return {
        status: STATUS.CRITICAL,
        message: `健康檢查失敗 (HTTP ${result.status})`,
        responseTime: result.responseTime,
      };
    }

    const statusOk = result.data.status === 'healthy';
    const responseTimeOk =
      result.responseTime <= config.thresholds.responseTime;

    if (!statusOk) {
      return {
        status: STATUS.CRITICAL,
        message: `應用狀態異常: ${result.data.status}`,
        responseTime: result.responseTime,
      };
    }

    if (!responseTimeOk) {
      return {
        status: STATUS.WARNING,
        message: `回應時間過長: ${result.responseTime}ms (閾值: ${config.thresholds.responseTime}ms)`,
        responseTime: result.responseTime,
      };
    }

    return {
      status: STATUS.OK,
      message: '基本健康檢查通過',
      responseTime: result.responseTime,
      data: result.data,
    };
  } catch (error) {
    return {
      status: STATUS.CRITICAL,
      message: `健康檢查錯誤: ${error.message}`,
      responseTime: 0,
    };
  }
}

/**
 * 詳細健康檢查
 */
async function checkDetailedHealth() {
  log.info('執行詳細健康檢查...');

  try {
    const result = await makeRequest('/health');

    if (!result.success) {
      return {
        status: STATUS.CRITICAL,
        message: `詳細健康檢查失敗 (HTTP ${result.status})`,
        responseTime: result.responseTime,
      };
    }

    const { data } = result;
    const issues = [];

    // 檢查總體狀態
    if (data.status === 'unhealthy') {
      issues.push('系統狀態異常');
    } else if (data.status === 'degraded') {
      issues.push('系統性能降級');
    }

    // 檢查記憶體使用率
    if (
      data.metrics &&
      data.metrics.memoryUsagePercent > config.thresholds.memoryUsage
    ) {
      issues.push(`記憶體使用率過高: ${data.metrics.memoryUsagePercent}%`);
    }

    // 檢查各項服務狀態
    if (data.services) {
      Object.entries(data.services).forEach(([service, serviceData]) => {
        if (serviceData.status === 'unhealthy') {
          issues.push(`${service} 服務異常`);
        }
      });
    }

    if (issues.length > 0) {
      return {
        status: data.status === 'unhealthy' ? STATUS.CRITICAL : STATUS.WARNING,
        message: `檢測到問題: ${issues.join(', ')}`,
        responseTime: result.responseTime,
        data: data,
      };
    }

    return {
      status: STATUS.OK,
      message: '詳細健康檢查通過',
      responseTime: result.responseTime,
      data: data,
    };
  } catch (error) {
    return {
      status: STATUS.CRITICAL,
      message: `詳細健康檢查錯誤: ${error.message}`,
      responseTime: 0,
    };
  }
}

/**
 * 數據一致性檢查
 */
async function checkDataConsistency() {
  log.info('執行數據一致性檢查...');

  try {
    const result = await makeRequest('/health/consistency', config.timeout * 2); // 較長超時

    if (!result.success) {
      return {
        status: STATUS.WARNING,
        message: `數據一致性檢查失敗 (HTTP ${result.status})`,
        responseTime: result.responseTime,
      };
    }

    const { data } = result;
    const { report } = data;

    if (report.inconsistentJobs > config.thresholds.inconsistentJobs) {
      return {
        status: data.status === 'unhealthy' ? STATUS.CRITICAL : STATUS.WARNING,
        message: `數據一致性問題: ${report.inconsistentJobs} 個不一致的任務`,
        responseTime: result.responseTime,
        data: data,
      };
    }

    return {
      status: STATUS.OK,
      message: '數據一致性檢查通過',
      responseTime: result.responseTime,
      data: data,
    };
  } catch (error) {
    return {
      status: STATUS.WARNING,
      message: `數據一致性檢查錯誤: ${error.message}`,
      responseTime: 0,
    };
  }
}

/**
 * 輸出結果
 */
function outputResults(results) {
  const overallStatus = results.reduce((worst, result) => {
    if (result.status === STATUS.CRITICAL) return STATUS.CRITICAL;
    if (result.status === STATUS.WARNING && worst !== STATUS.CRITICAL)
      return STATUS.WARNING;
    if (result.status === STATUS.UNKNOWN && worst === STATUS.OK)
      return STATUS.UNKNOWN;
    return worst;
  }, STATUS.OK);

  switch (config.outputFormat) {
    case 'json':
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            overallStatus,
            checks: results,
            config: {
              baseUrl: config.baseUrl,
              thresholds: config.thresholds,
            },
          },
          null,
          2,
        ),
      );
      break;

    case 'prometheus':
      console.log(
        '# HELP syosetu2epub_health_status Overall health status (0=OK, 1=WARNING, 2=CRITICAL, 3=UNKNOWN)',
      );
      console.log('# TYPE syosetu2epub_health_status gauge');

      const statusValue = {
        [STATUS.OK]: 0,
        [STATUS.WARNING]: 1,
        [STATUS.CRITICAL]: 2,
        [STATUS.UNKNOWN]: 3,
      }[overallStatus];

      console.log(`syosetu2epub_health_status ${statusValue}`);

      results.forEach((result, index) => {
        const checkName = ['basic', 'detailed', 'consistency'][index];
        const value = statusValue;
        console.log(`syosetu2epub_health_check{check="${checkName}"} ${value}`);
        console.log(
          `syosetu2epub_response_time_ms{check="${checkName}"} ${result.responseTime}`,
        );
      });
      break;

    case 'simple':
    default:
      console.log(`狀態: ${overallStatus}`);
      console.log(`時間: ${new Date().toISOString()}`);
      console.log('---');

      results.forEach((result, index) => {
        const checkName = ['基本檢查', '詳細檢查', '一致性檢查'][index];
        console.log(
          `${checkName}: ${result.status} - ${result.message} (${result.responseTime}ms)`,
        );
      });
      break;
  }

  // 設置退出碼
  const exitCode = {
    [STATUS.OK]: 0,
    [STATUS.WARNING]: 1,
    [STATUS.CRITICAL]: 2,
    [STATUS.UNKNOWN]: 3,
  }[overallStatus];

  process.exit(exitCode);
}

/**
 * 主執行函數
 */
async function main() {
  log.info('開始健康監控檢查...');

  const checks = [checkBasicHealth, checkDetailedHealth, checkDataConsistency];

  const results = [];

  for (const check of checks) {
    try {
      const result = await check();
      results.push(result);
    } catch (error) {
      results.push({
        status: STATUS.UNKNOWN,
        message: `檢查執行失敗: ${error.message}`,
        responseTime: 0,
      });
    }
  }

  outputResults(results);
}

// 執行監控
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    log.error(`監控執行失敗: ${error.message}`);
    process.exit(3);
  });
}

export { main, checkBasicHealth, checkDetailedHealth, checkDataConsistency };

# Syosetu2EPUB 監控系統

## 🎯 概述

本監控系統為 Syosetu2EPUB 應用提供全面的健康檢查和告警機制，確保系統穩定運行並在出現問題時及時通知管理員。

## 📊 監控指標

### 系統健康指標

- **應用狀態**: healthy, degraded, unhealthy
- **回應時間**: API 端點回應延遲
- **記憶體使用率**: 系統記憶體消耗百分比
- **服務狀態**: Redis、Queue、Lock 等關鍵服務狀態

### 業務指標

- **數據一致性**: 佇列、緩存、資料庫間的數據同步狀態
- **任務處理**: EPUB 轉換任務的成功率和處理時間
- **錯誤率**: API 請求失敗比例

## 🔧 設置說明

### 1. 環境變數配置

在 `.env` 檔案中設置以下變數：

```env
# 監控配置
MONITOR_BASE_URL=http://localhost:3000
MONITOR_TIMEOUT=10000
MONITOR_RESPONSE_TIME_THRESHOLD=5000
MONITOR_MEMORY_THRESHOLD=85
MONITOR_INCONSISTENT_JOBS_THRESHOLD=5
MONITOR_OUTPUT_FORMAT=simple
MONITOR_VERBOSE=false

# 通知配置
SMTP_SERVER=smtp.gmail.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# 監控工具整合
UPTIME_KUMA_ENDPOINT=http://localhost:3001
UPTIME_KUMA_PUSH_URL=http://localhost:3001/api/push/your-key
GRAFANA_DASHBOARD_URL=http://localhost:3002
```

### 2. 健康監控腳本

#### 基本使用

```bash
# 執行基本健康檢查
node backend/monitoring/health-monitor.js

# 詳細模式
MONITOR_VERBOSE=true node backend/monitoring/health-monitor.js

# JSON 輸出格式
MONITOR_OUTPUT_FORMAT=json node backend/monitoring/health-monitor.js

# Prometheus 格式輸出
MONITOR_OUTPUT_FORMAT=prometheus node backend/monitoring/health-monitor.js
```

#### 輸出範例

**簡單格式：**

```
狀態: OK
時間: 2024-12-19T10:30:00.000Z
---
基本檢查: OK - 基本健康檢查通過 (120ms)
詳細檢查: OK - 詳細健康檢查通過 (350ms)
一致性檢查: OK - 數據一致性檢查通過 (800ms)
```

**JSON 格式：**

```json
{
  "timestamp": "2024-12-19T10:30:00.000Z",
  "overallStatus": "OK",
  "checks": [
    {
      "status": "OK",
      "message": "基本健康檢查通過",
      "responseTime": 120
    }
  ]
}
```

### 3. 定時監控設置

#### 使用 Cron

```bash
# 編輯 crontab
crontab -e

# 每分鐘執行健康檢查
* * * * * cd /path/to/your/app && node backend/monitoring/health-monitor.js >> /var/log/syosetu2epub-monitor.log 2>&1

# 每 5 分鐘執行詳細檢查
*/5 * * * * cd /path/to/your/app && MONITOR_OUTPUT_FORMAT=json node backend/monitoring/health-monitor.js > /tmp/health-status.json
```

#### 使用 Systemd Timer

創建 `/etc/systemd/system/syosetu2epub-monitor.service`：

```ini
[Unit]
Description=Syosetu2EPUB Health Monitor
After=network.target

[Service]
Type=oneshot
User=app
WorkingDirectory=/path/to/your/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node backend/monitoring/health-monitor.js
StandardOutput=journal
StandardError=journal
```

創建 `/etc/systemd/system/syosetu2epub-monitor.timer`：

```ini
[Unit]
Description=Run Syosetu2EPUB Health Monitor every minute
Requires=syosetu2epub-monitor.service

[Timer]
OnCalendar=*:*:00
Persistent=true

[Install]
WantedBy=timers.target
```

啟用定時器：

```bash
sudo systemctl daemon-reload
sudo systemctl enable syosetu2epub-monitor.timer
sudo systemctl start syosetu2epub-monitor.timer
```

## 🔔 告警設置

### 1. Uptime Kuma 整合

1. 安裝 Uptime Kuma：

```bash
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
```

2. 創建監控項目：

   - URL: `http://your-app.com/health/quick`
   - 檢查間隔: 60 秒
   - 超時: 10 秒

3. 設置通知：
   - 電子郵件
   - Slack/Discord Webhook
   - Telegram Bot

### 2. Prometheus + Grafana

#### Prometheus 配置

在 `prometheus.yml` 中添加：

```yaml
scrape_configs:
  - job_name: 'syosetu2epub'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/health/metrics'
    scrape_interval: 30s
```

#### Grafana 儀表板

導入提供的儀表板模板，包含以下面板：

- 系統狀態概覽
- 回應時間趨勢
- 記憶體使用率
- 數據一致性狀況
- 服務狀態網格

### 3. 自定義 Webhook 通知

創建 Webhook 端點來接收告警：

```javascript
// webhook-handler.js
app.post('/webhook/alert', (req, res) => {
  const { overallStatus, checks } = req.body;

  if (overallStatus !== 'OK') {
    // 發送通知到 Slack、Discord 或其他服務
    sendNotification({
      title: 'Syosetu2EPUB 告警',
      status: overallStatus,
      details: checks,
    });
  }

  res.status(200).send('OK');
});
```

## 📋 健康檢查端點

| 端點                  | 描述           | 超時 | 用途           |
| --------------------- | -------------- | ---- | -------------- |
| `/health/quick`       | 快速健康檢查   | 5s   | 基本可用性監控 |
| `/health`             | 完整系統檢查   | 10s  | 詳細狀態監控   |
| `/health/consistency` | 數據一致性檢查 | 20s  | 業務邏輯監控   |
| `/health/metrics`     | 系統指標       | 5s   | 性能監控       |

## 🚨 告警等級

### OK (綠色)

- 所有檢查通過
- 回應時間正常
- 系統資源充足

### WARNING (黃色)

- 回應時間較長但可接受
- 記憶體使用率偏高
- 少量數據一致性問題
- 系統狀態為 `degraded`

### CRITICAL (紅色)

- 應用無回應
- 系統狀態為 `unhealthy`
- 關鍵服務異常
- 嚴重的數據一致性問題

### UNKNOWN (灰色)

- 監控腳本執行失敗
- 網路連接問題
- 未預期的錯誤

## 🔧 故障排除

### 常見問題

1. **監控腳本無法連接到應用**

   - 檢查 `MONITOR_BASE_URL` 設置
   - 確認應用正在運行
   - 檢查防火牆和網路設置

2. **記憶體使用率持續偏高**

   - 檢查是否有記憶體洩漏
   - 重啟應用程式
   - 增加伺服器記憶體

3. **數據一致性問題**

   - 執行手動同步: `POST /health/consistency`
   - 檢查 Redis 連接狀態
   - 查看應用程式日誌

4. **告警通知未收到**
   - 檢查環境變數設置
   - 測試 SMTP 連接
   - 驗證 Webhook URL

### 日誌查看

```bash
# 查看應用程式日誌
docker logs syosetu2epub-backend

# 查看監控日誌
tail -f /var/log/syosetu2epub-monitor.log

# 查看系統日誌
journalctl -u syosetu2epub-monitor.service -f
```

## 📈 性能調優

### 監控頻率優化

- 基本檢查: 每 1 分鐘
- 詳細檢查: 每 5 分鐘
- 一致性檢查: 每 15 分鐘

### 告警閾值調整

根據實際運行情況調整 `alert-config.yaml` 中的閾值：

```yaml
thresholds:
  response_time:
    warning: 2000 # 降低到 2 秒
    critical: 4000 # 降低到 4 秒

  memory_usage:
    warning: 75 # 降低到 75%
    critical: 85 # 保持 85%
```

## 🔗 相關資源

- [健康檢查 API 文檔](../docs/api/health.md)
- [系統架構說明](../docs/architecture.md)
- [部署指南](../docs/deployment.md)
- [Uptime Kuma 官方文檔](https://uptime.kuma.pet/)
- [Prometheus 監控指南](https://prometheus.io/docs/)
- [Grafana 儀表板](https://grafana.com/docs/)

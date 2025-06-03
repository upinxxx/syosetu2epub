# Syosetu2EPUB API v1 端點測試腳本
# 測試所有統一的 API 端點

$baseUrl = "http://localhost:3000"
$results = @()

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Description,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Host "測試: $Description" -ForegroundColor Yellow
    Write-Host "  $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        Write-Host "  ✅ 狀態碼: $statusCode" -ForegroundColor Green
        
        # 檢查統一回應格式
        if ($content -and $content.PSObject.Properties.Name -contains "success" -and $content.PSObject.Properties.Name -contains "timestamp") {
            Write-Host "  ✅ 統一回應格式: 正確" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  統一回應格式: 不符合規範" -ForegroundColor Yellow
        }
        
        $results += @{
            Description = $Description
            Method = $Method
            Url = $Url
            StatusCode = $statusCode
            Success = $true
            HasUnifiedFormat = ($content -and $content.PSObject.Properties.Name -contains "success")
        }
        
    } catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "N/A" }
        Write-Host "  ❌ 錯誤: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  ❌ 狀態碼: $statusCode" -ForegroundColor Red
        
        $results += @{
            Description = $Description
            Method = $Method
            Url = $Url
            StatusCode = $statusCode
            Success = $false
            Error = $_.Exception.Message
        }
    }
    
    Write-Host ""
}

Write-Host "🚀 開始測試 Syosetu2EPUB API v1 端點" -ForegroundColor Cyan
Write-Host "=" * 50

# 1. 健康檢查端點（無前綴）
Write-Host "📋 測試健康檢查端點" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Url "$baseUrl/health" -Description "基本健康檢查"
Test-Endpoint -Method "GET" -Url "$baseUrl/health/quick" -Description "快速健康檢查"

# 2. 認證相關 API
Write-Host "🔐 測試認證相關 API" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1/auth/me" -Description "獲取當前用戶資訊（需認證）"

# 3. 用戶相關 API
Write-Host "👤 測試用戶相關 API" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1/users/profile" -Description "獲取用戶資料（需認證）"
Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1/users/recent-jobs" -Description "獲取最近任務（需認證）"
Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1/users/sender-email" -Description "獲取發送郵箱（需認證）"

# 4. 小說相關 API
Write-Host "📚 測試小說相關 API" -ForegroundColor Magenta
$previewBody = @{
    url = "https://ncode.syosetu.com/n0000aa/"
    site = "narou"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/novels/preview" -Description "預覽小說" -Body $previewBody

# 5. 轉檔相關 API
Write-Host "🔄 測試轉檔相關 API" -ForegroundColor Magenta
$convertBody = @{
    url = "https://ncode.syosetu.com/n0000aa/"
    site = "narou"
    format = "epub"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Url "$baseUrl/api/v1/conversions" -Description "提交轉檔任務（需認證）" -Body $convertBody

# 6. Kindle 相關 API
Write-Host "📱 測試 Kindle 相關 API" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1/kindle/deliveries" -Description "獲取交付歷史（需認證）"

# 7. 健康檢查指標（需認證）
Write-Host "📊 測試系統指標 API" -ForegroundColor Magenta
Test-Endpoint -Method "GET" -Url "$baseUrl/api/v1/health/metrics" -Description "系統指標（需認證）"

# 總結報告
Write-Host "📊 測試結果總結" -ForegroundColor Cyan
Write-Host "=" * 50

$totalTests = $results.Count
$successfulTests = ($results | Where-Object { $_.Success }).Count
$unifiedFormatTests = ($results | Where-Object { $_.HasUnifiedFormat }).Count

Write-Host "總測試數: $totalTests" -ForegroundColor White
Write-Host "成功測試: $successfulTests" -ForegroundColor Green
Write-Host "失敗測試: $($totalTests - $successfulTests)" -ForegroundColor Red
Write-Host "統一格式: $unifiedFormatTests" -ForegroundColor Blue

Write-Host "`n詳細結果:" -ForegroundColor White
foreach ($result in $results) {
    $status = if ($result.Success) { "✅" } else { "❌" }
    $format = if ($result.HasUnifiedFormat) { "📋" } else { "⚠️" }
    Write-Host "$status $format [$($result.StatusCode)] $($result.Description)" -ForegroundColor Gray
    if ($result.Error) {
        Write-Host "    錯誤: $($result.Error)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 測試完成！" -ForegroundColor Cyan 
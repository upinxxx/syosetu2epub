# EPUB 後端部署腳本 - API 和 Worker 分離部署
# 使用方式: .\scripts\deploy-all.ps1

param(
    [string]$Mode = "both",  # both, api, worker
    [switch]$SkipBuild = $false,
    [switch]$DryRun = $false
)

# 設置顏色輸出
function Write-ColorOutput([string]$ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "🚀 開始部署 EPUB 後端服務..."
Write-ColorOutput Green "部署模式: $Mode"

# 檢查 gcloud 是否已安裝
if (!(Get-Command "gcloud" -ErrorAction SilentlyContinue)) {
    Write-ColorOutput Red "❌ 錯誤: 請先安裝 Google Cloud SDK"
    Write-ColorOutput Yellow "下載地址: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# 檢查是否已登入 gcloud
$gcloudAuth = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if ([string]::IsNullOrEmpty($gcloudAuth)) {
    Write-ColorOutput Red "❌ 錯誤: 請先登入 Google Cloud"
    Write-ColorOutput Yellow "執行: gcloud auth login"
    exit 1
}

Write-ColorOutput Green "✅ Google Cloud 認證正常: $gcloudAuth"

# 檢查專案設定
$currentProject = gcloud config get-value project 2>$null
if ([string]::IsNullOrEmpty($currentProject)) {
    Write-ColorOutput Red "❌ 錯誤: 請先設定 Google Cloud 專案"
    Write-ColorOutput Yellow "執行: gcloud config set project YOUR_PROJECT_ID"
    exit 1
}

Write-ColorOutput Green "✅ 當前專案: $currentProject"

# 建置步驟
if (-not $SkipBuild) {
    Write-ColorOutput Cyan "🔨 正在建置專案..."
    
    if ($DryRun) {
        Write-ColorOutput Yellow "[DRY RUN] 將執行: pnpm run build"
    } else {
        pnpm run build
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput Red "❌ 建置失敗"
            exit 1
        }
        Write-ColorOutput Green "✅ 建置完成"
    }
} else {
    Write-ColorOutput Yellow "⚠️  跳過建置步驟"
}

# 部署函數
function Deploy-Service {
    param(
        [string]$ServiceName,
        [string]$ConfigFile,
        [string]$DisplayName
    )
    
    Write-ColorOutput Cyan "🚀 正在部署 $DisplayName..."
    
    if ($DryRun) {
        Write-ColorOutput Yellow "[DRY RUN] 將執行: gcloud app deploy $ConfigFile --quiet"
        return $true
    }
    
    try {
        gcloud app deploy $ConfigFile --quiet
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput Green "✅ $DisplayName 部署成功"
            return $true
        } else {
            Write-ColorOutput Red "❌ $DisplayName 部署失敗"
            return $false
        }
    } catch {
        Write-ColorOutput Red "❌ $DisplayName 部署過程中發生錯誤: $($_.Exception.Message)"
        return $false
    }
}

# 執行部署
$deploymentResults = @()

switch ($Mode.ToLower()) {
    "api" {
        $result = Deploy-Service -ServiceName "default" -ConfigFile "app.yaml" -DisplayName "API 服務"
        $deploymentResults += @{ Service = "API"; Success = $result }
    }
    "worker" {
        $result = Deploy-Service -ServiceName "epub-worker" -ConfigFile "worker.yaml" -DisplayName "Worker 服務"
        $deploymentResults += @{ Service = "Worker"; Success = $result }
    }
    "both" {
        # 部署 API
        $apiResult = Deploy-Service -ServiceName "default" -ConfigFile "app.yaml" -DisplayName "API 服務"
        $deploymentResults += @{ Service = "API"; Success = $apiResult }
        
        # 部署 Worker  
        $workerResult = Deploy-Service -ServiceName "epub-worker" -ConfigFile "worker.yaml" -DisplayName "Worker 服務"
        $deploymentResults += @{ Service = "Worker"; Success = $workerResult }
    }
    default {
        Write-ColorOutput Red "❌ 無效的部署模式: $Mode"
        Write-ColorOutput Yellow "有效選項: api, worker, both"
        exit 1
    }
}

# 部署結果摘要  
Write-ColorOutput Cyan "`n📊 部署結果摘要:"
Write-ColorOutput Cyan "=" * 50

$allSuccess = $true
foreach ($result in $deploymentResults) {
    if ($result.Success) {
        Write-ColorOutput Green "✅ $($result.Service): 成功"
    } else {
        Write-ColorOutput Red "❌ $($result.Service): 失敗"
        $allSuccess = $false
    }
}

Write-ColorOutput Cyan "=" * 50

if ($allSuccess) {
    Write-ColorOutput Green "🎉 所有服務部署成功！"
    
    if (-not $DryRun) {
        Write-ColorOutput Cyan "`n🔗 服務 URL:"
        Write-ColorOutput White "API: https://$currentProject.appspot.com"
        Write-ColorOutput White "Worker: https://epub-worker-dot-$currentProject.appspot.com"
    }
} else {
    Write-ColorOutput Red "❌ 部分服務部署失敗，請檢查錯誤訊息"
    exit 1
}

Write-ColorOutput Green "`n🎯 部署完成！" 
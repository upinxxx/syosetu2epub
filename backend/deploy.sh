#!/bin/bash

# Syosetu2EPUB 後端部署腳本
# 版本: 1.1.0
# 修改日期: 2024-12-19

set -e  # 遇到錯誤立即退出

echo "🚀 開始部署 Syosetu2EPUB 後端..."

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數定義
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查必要的環境變數
check_env_vars() {
    log_info "檢查環境變數..."
    
    required_vars=(
        "DB_HOST"
        "DB_PORT"
        "DB_USERNAME"
        "DB_PASSWORD"
        "DB_DATABASE"
        "JWT_SECRET"
        "UPSTASH_REDIS_HOST"
        "UPSTASH_REDIS_PORT"
        "UPSTASH_REDIS_USERNAME"
        "UPSTASH_REDIS_PASSWORD"
        "SUPABASE_URL"
        "SUPABASE_KEY"
        "RESEND_API_KEY"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=($var)
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少必要的環境變數:"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi
    
    log_success "環境變數檢查通過"
}

# 健康檢查函數
health_check() {
    log_info "執行部署前健康檢查..."
    
    # 檢查 Node.js 版本
    node_version=$(node --version)
    log_info "Node.js 版本: $node_version"
    
    # 檢查 pnpm 版本
    if command -v pnpm &> /dev/null; then
        pnpm_version=$(pnpm --version)
        log_info "pnpm 版本: $pnpm_version"
    else
        log_error "pnpm 未安裝，請先安裝 pnpm"
        exit 1
    fi
    
    # 檢查磁碟空間
    available_space=$(df -h . | awk 'NR==2 {print $4}')
    log_info "可用磁碟空間: $available_space"
    
    log_success "健康檢查完成"
}

# 備份現有部署
backup_current() {
    if [ -d "./dist" ]; then
        backup_dir="./backup/$(date +%Y%m%d_%H%M%S)"
        log_info "備份現有部署到 $backup_dir"
        mkdir -p "$backup_dir"
        cp -r ./dist/* "$backup_dir/" 2>/dev/null || true
        log_success "備份完成"
    fi
}

# 安裝依賴
install_dependencies() {
    log_info "安裝專案依賴..."
    pnpm install --frozen-lockfile
    log_success "依賴安裝完成"
}

# 執行建置
build_project() {
    log_info "建置專案..."
    pnpm run build
    
    if [ ! -d "./dist" ]; then
        log_error "建置失敗：dist 目錄不存在"
        exit 1
    fi
    
    log_success "專案建置完成"
}

# 執行資料庫遷移
run_migrations() {
    log_info "執行資料庫遷移..."
    
    # 檢查是否有待執行的遷移
    if pnpm run typeorm -- migration:show -d src/config/data-source.ts | grep -q "No pending migrations"; then
        log_info "沒有待執行的遷移"
    else
        pnpm run migrate:run
        log_success "資料庫遷移完成"
    fi
}

# 部署後驗證
post_deploy_verification() {
    log_info "執行部署後驗證..."
    
    # 檢查建置檔案
    if [ ! -f "./dist/main.js" ]; then
        log_error "主程式檔案不存在"
        exit 1
    fi
    
    if [ ! -f "./dist/main.worker.js" ]; then
        log_error "Worker 程式檔案不存在"
        exit 1
    fi
    
    # 檢查關鍵模組
    critical_files=(
        "./dist/presentation/health.controller.js"
        "./dist/application/health/health.facade.js"
        "./dist/application/jobs/data-consistency-validator.service.js"
        "./dist/infrastructure/queue/queue.adapter.js"
    )
    
    for file in "${critical_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_warning "關鍵檔案不存在: $file"
        fi
    done
    
    log_success "部署後驗證完成"
}

# 顯示部署資訊
show_deploy_info() {
    echo
    log_success "🎉 部署成功！"
    echo
    echo "部署資訊:"
    echo "├── 建置時間: $(date)"
    echo "├── Node.js 版本: $(node --version)"
    echo "├── 主程式: dist/main.js"
    echo "├── Worker 程式: dist/main.worker.js"
    echo "└── 健康檢查端點: /health"
    echo
    echo "啟動命令:"
    echo "├── 主服務: pnpm run start:prod"
    echo "└── Worker: pnpm run worker:prod"
    echo
    echo "監控端點:"
    echo "├── 健康檢查: GET /health"
    echo "├── 快速檢查: GET /health/quick"
    echo "├── 數據一致性: GET /health/consistency"
    echo "└── 系統指標: GET /health/metrics"
    echo
}

# 主要執行流程
main() {
    echo "======================================"
    echo "    Syosetu2EPUB 後端部署腳本 v1.1.0"
    echo "======================================"
    echo
    
    # 檢查是否在正確的目錄
    if [ ! -f "package.json" ]; then
        log_error "請在後端專案根目錄執行此腳本"
        exit 1
    fi
    
    # 執行部署流程
    check_env_vars
    health_check
    backup_current
    install_dependencies
    build_project
    run_migrations
    post_deploy_verification
    show_deploy_info
    
    log_success "部署流程完成！"
}

# 執行主函數
main "$@" 
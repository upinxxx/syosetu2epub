#!/bin/bash

# Syosetu2EPUB 前端部署腳本
# 版本: 1.1.0
# 修改日期: 2024-12-19
# 適用於 Vercel 部署

set -e  # 遇到錯誤立即退出

echo "🚀 開始部署 Syosetu2EPUB 前端..."

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
        "VITE_API_URL"
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
    log_info "API URL: $VITE_API_URL"
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

# 清理快取
clean_cache() {
    log_info "清理建置快取..."
    
    if [ -d "./dist" ]; then
        rm -rf ./dist
        log_info "移除舊的 dist 目錄"
    fi
    
    if [ -d "./.next" ]; then
        rm -rf ./.next
        log_info "移除 .next 目錄"
    fi
    
    if [ -d "./node_modules/.vite" ]; then
        rm -rf ./node_modules/.vite
        log_info "移除 Vite 快取"
    fi
    
    log_success "快取清理完成"
}

# 安裝依賴
install_dependencies() {
    log_info "安裝專案依賴..."
    pnpm install --frozen-lockfile
    log_success "依賴安裝完成"
}

# 執行 TypeScript 檢查
type_check() {
    log_info "執行 TypeScript 類型檢查..."
    
    if pnpm run type-check 2>/dev/null; then
        log_success "TypeScript 檢查通過"
    else
        log_warning "TypeScript 檢查有警告，但繼續建置..."
    fi
}

# 執行建置
build_project() {
    log_info "建置專案..."
    
    # 設置建置環境
    export NODE_ENV=production
    
    pnpm run build
    
    if [ ! -d "./dist" ]; then
        log_error "建置失敗：dist 目錄不存在"
        exit 1
    fi
    
    # 檢查關鍵檔案
    if [ ! -f "./dist/index.html" ]; then
        log_error "建置失敗：index.html 不存在"
        exit 1
    fi
    
    log_success "專案建置完成"
}

# 建置產物驗證
validate_build() {
    log_info "驗證建置產物..."
    
    # 檢查建置大小
    build_size=$(du -sh ./dist | cut -f1)
    log_info "建置大小: $build_size"
    
    # 檢查關鍵檔案
    critical_files=(
        "./dist/index.html"
        "./dist/assets"
    )
    
    for file in "${critical_files[@]}"; do
        if [ ! -e "$file" ]; then
            log_error "關鍵檔案/目錄不存在: $file"
            exit 1
        fi
    done
    
    # 檢查是否有 JavaScript 檔案
    js_files=$(find ./dist -name "*.js" | wc -l)
    if [ "$js_files" -eq 0 ]; then
        log_error "沒有找到 JavaScript 檔案"
        exit 1
    fi
    
    log_info "找到 $js_files 個 JavaScript 檔案"
    log_success "建置產物驗證通過"
}

# 預覽建置結果
preview_build() {
    log_info "可選：預覽建置結果"
    echo "如需預覽，請執行: pnpm run preview"
    echo "預覽地址: http://localhost:4173"
}

# 顯示部署資訊
show_deploy_info() {
    echo
    log_success "🎉 前端建置成功！"
    echo
    echo "建置資訊:"
    echo "├── 建置時間: $(date)"
    echo "├── Node.js 版本: $(node --version)"
    echo "├── 建置目錄: ./dist"
    echo "├── API URL: $VITE_API_URL"
    echo "└── 建置大小: $(du -sh ./dist | cut -f1)"
    echo
    echo "Vercel 部署:"
    echo "├── 建置命令: pnpm run build"
    echo "├── 輸出目錄: dist"
    echo "└── Node.js 版本: 18.x"
    echo
    echo "環境變數 (Vercel):"
    echo "└── VITE_API_URL: 後端 API 地址"
    echo
}

# 主要執行流程
main() {
    echo "======================================"
    echo "   Syosetu2EPUB 前端部署腳本 v1.1.0"
    echo "======================================"
    echo
    
    # 檢查是否在正確的目錄
    if [ ! -f "package.json" ]; then
        log_error "請在前端專案根目錄執行此腳本"
        exit 1
    fi
    
    # 執行部署流程
    check_env_vars
    health_check
    clean_cache
    install_dependencies
    type_check
    build_project
    validate_build
    preview_build
    show_deploy_info
    
    log_success "前端建置完成！"
}

# 執行主函數
main "$@" 
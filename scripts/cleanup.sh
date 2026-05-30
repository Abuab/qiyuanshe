#!/bin/bash
# =============================================
# 栖缘社日志清理脚本
# 支持：应用日志、Nginx日志、Docker资源清理
# =============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO] $(date '+%Y-%m-%d %H:%M:%S') ${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') ${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $(date '+%Y-%m-%d %H:%M:%S') ${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR] $(date '+%Y-%m-%d %H:%M:%S') ${NC} $1"
}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 清理配置
APP_LOG_RETENTION_DAYS=7
NGINX_LOG_RETENTION_DAYS=30
LOG_FILE="${PROJECT_DIR}/logs/cleanup.log"

# 创建必要目录
mkdir -p "$(dirname "$LOG_FILE")"

# 清理应用日志
cleanup_app_logs() {
    log_info "清理应用日志（保留 ${APP_LOG_RETENTION_DAYS} 天）..."

    local app_logs_dir="${PROJECT_DIR}/logs"
    local deleted_count=0

    if [ -d "$app_logs_dir" ]; then
        while IFS= read -r file; do
            if [ -n "$file" ] && [ -f "$file" ]; then
                rm -f "$file"
                deleted_count=$((deleted_count + 1))
                log_info "已删除: $file"
            fi
        done < <(find "$app_logs_dir" -name "*.log" -mtime +${APP_LOG_RETENTION_DAYS} -type f 2>/dev/null)

        # 清理空的日志目录
        find "$app_logs_dir" -type d -empty -delete 2>/dev/null || true
    fi

    # 清理 Docker 容器日志
    log_info "清理 Docker 容器日志..."
    for container in $(docker ps --format '{{.Names}}' 2>/dev/null); do
        local log_file=$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null)
        if [ -n "$log_file" ] && [ -f "$log_file" ]; then
            : > "$log_file" 2>/dev/null && log_info "已清理容器 $container 的日志" || true
        fi
    done

    if [ $deleted_count -gt 0 ]; then
        log_success "已清理 $deleted_count 个应用日志文件"
    else
        log_info "没有需要清理的应用日志"
    fi
}

# 清理 Nginx 日志
cleanup_nginx_logs() {
    log_info "清理 Nginx 日志（保留 ${NGINX_LOG_RETENTION_DAYS} 天）..."

    local nginx_logs_dir="${PROJECT_DIR}/docker/nginx"
    local deleted_count=0

    if [ -d "$nginx_logs_dir" ]; then
        while IFS= read -r file; do
            if [ -n "$file" ] && [ -f "$file" ]; then
                : > "$file" 2>/dev/null && log_info "已清空: $file" || true
                deleted_count=$((deleted_count + 1))
            fi
        done < <(find "$nginx_logs_dir" -name "*.log" -type f 2>/dev/null)
    fi

    # 尝试清理 Docker 中的 Nginx 日志
    if docker ps --format '{{.Names}}' | grep -q "^lingtong_nginx$"; then
        docker exec lingtong_nginx sh -c 'find /var/log/nginx -name "*.log" -type f -exec truncate -s 0 {} \;' 2>/dev/null || true
        log_info "已清空 Docker Nginx 日志"
    fi

    if [ $deleted_count -gt 0 ]; then
        log_success "已清理 $deleted_count 个 Nginx 日志文件"
    else
        log_info "没有需要清理的 Nginx 日志"
    fi
}

# 清理 Docker 未使用的镜像
cleanup_docker_images() {
    log_info "清理未使用的 Docker 镜像..."

    local before_size=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l)

    if [ "$before_size" -gt 0 ]; then
        docker image prune -f --filter "until=24h" 2>/dev/null || true
        log_success "已清理悬空镜像"
    else
        log_info "没有需要清理的悬空镜像"
    fi
}

# 清理 Docker 未使用的卷
cleanup_docker_volumes() {
    log_info "清理未使用的 Docker 卷..."

    local unused_volumes=$(docker volume ls -f dangling=true -q 2>/dev/null | wc -l)

    if [ "$unused_volumes" -gt 0 ]; then
        docker volume prune -f 2>/dev/null || true
        log_success "已清理未使用的 Docker 卷"
    else
        log_info "没有需要清理的 Docker 卷"
    fi
}

# 清理 Docker 未使用的网络
cleanup_docker_networks() {
    log_info "清理未使用的 Docker 网络..."

    local unused_networks=$(docker network ls -f dangling=true -q 2>/dev/null | wc -l)

    if [ "$unused_networks" -gt 0 ]; then
        docker network prune -f 2>/dev/null || true
        log_success "已清理未使用的 Docker 网络"
    else
        log_info "没有需要清理的 Docker 网络"
    fi
}

# 清理构建缓存
cleanup_build_cache() {
    log_info "清理 Docker 构建缓存..."

    docker builder prune -f --filter "until=168h" 2>/dev/null || true
    log_success "已清理 Docker 构建缓存"
}

# 清理 npm 缓存（可选）
cleanup_npm_cache() {
    if command -v npm &> /dev/null; then
        log_info "清理 npm 缓存..."
        npm cache clean --force 2>/dev/null || true
        log_success "已清理 npm 缓存"
    fi
}

# 清理临时文件
cleanup_temp_files() {
    log_info "清理临时文件..."

    local deleted_count=0

    # 清理项目目录中的临时文件
    while IFS= read -r file; do
        if [ -n "$file" ] && [ -f "$file" ]; then
            rm -f "$file"
            deleted_count=$((deleted_count + 1))
        fi
    done < <(find "$PROJECT_DIR" \( -name "*.tmp" -o -name "*.temp" -o -name "*.swp" -o -name "*~" \) -type f 2>/dev/null)

    # 清理 __pycache__ 目录
    while IFS= read -r dir; do
        if [ -n "$dir" ]; then
            rm -rf "$dir"
            deleted_count=$((deleted_count + 1))
        fi
    done < <(find "$PROJECT_DIR" -name "__pycache__" -type d 2>/dev/null)

    if [ $deleted_count -gt 0 ]; then
        log_success "已清理 $deleted_count 个临时文件/目录"
    else
        log_info "没有需要清理的临时文件"
    fi
}

# 显示清理统计
show_stats() {
    log_info "清理统计信息..."

    echo ""
    echo "============================================="
    echo "           清理完成统计"
    echo "============================================="

    # Docker 资源使用情况
    echo "Docker 资源使用:"
    echo "  镜像数量: $(docker images -q 2>/dev/null | wc -l)"
    echo "  容器数量: $(docker ps -q 2>/dev/null | wc -l)"
    echo "  卷数量: $(docker volume ls -q 2>/dev/null | wc -l)"
    echo "  网络数量: $(docker network ls -q 2>/dev/null | wc -l)"

    # 磁盘使用情况
    echo ""
    echo "磁盘使用:"
    df -h "$PROJECT_DIR" | tail -1 | awk '{printf "  项目目录使用: %s (可用: %s)\n", $5, $4}'

    echo "============================================="
}

# 主函数
main() {
    echo ""
    echo "============================================="
    echo "       栖缘社 清理脚本 v1.0.0"
    echo "============================================="
    echo ""

    # 清理应用日志
    cleanup_app_logs

    # 清理 Nginx 日志
    cleanup_nginx_logs

    # 清理 Docker 资源
    cleanup_docker_images
    cleanup_docker_volumes
    cleanup_docker_networks
    cleanup_build_cache

    # 清理临时文件
    cleanup_temp_files

    # 清理 npm 缓存（可选）
    if [ "${CLEANUP_NPM_CACHE:-false}" == "true" ]; then
        cleanup_npm_cache
    fi

    # 显示统计
    show_stats

    # 记录清理日志
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleanup completed successfully" >> "$LOG_FILE"

    log_success "清理任务完成"
}

# 如果直接运行脚本，则执行主函数
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi

#!/bin/bash
# =============================================
# 栖缘社数据库备份脚本
# 支持：本地备份、压缩、远程上传（阿里云OSS）
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

# 备份配置
BACKUP_DIR="${BACKUP_PATH:-${PROJECT_DIR}/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
LOG_FILE="${PROJECT_DIR}/logs/backup.log"

# 创建必要目录
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# 加载环境变量
load_env() {
    if [ -f "${PROJECT_DIR}/.env" ]; then
        export $(grep -v '^#' "${PROJECT_DIR}/.env" | xargs)
    fi
}

# 备份数据库
backup_database() {
    local backup_file="${BACKUP_DIR}/lingtong_$(date +%Y%m%d_%H%M%S).sql"
    local compressed_file="${backup_file}.gz"

    log_info "开始备份数据库..."

    # 确保 MySQL 容器正在运行
    if ! docker ps --format '{{.Names}}' | grep -q "^lingtong_mysql$"; then
        log_error "MySQL 容器未运行"
        return 1
    fi

    # 执行备份
    if docker-compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T mysql mysqldump \
        -u root \
        -p"${MYSQL_ROOT_PASSWORD}" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --master-data=2 \
        --flush-logs \
        lingtong_match > "$backup_file" 2>/dev/null; then

        # 压缩备份文件
        if gzip -9 "$backup_file"; then
            log_success "数据库备份成功: $compressed_file"

            # 记录备份信息到日志
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: $compressed_file" >> "$LOG_FILE"

            # 返回压缩后的文件路径
            echo "$compressed_file"
            return 0
        else
            log_error "备份文件压缩失败"
            rm -f "$backup_file"
            return 1
        fi
    else
        log_error "数据库备份失败"
        rm -f "$backup_file"
        return 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理超过 ${BACKUP_RETENTION_DAYS} 天的旧备份..."

    local deleted_count=0

    # 查找并删除旧备份文件
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            rm -f "$file"
            deleted_count=$((deleted_count + 1))
            log_info "已删除旧备份: $file"
        fi
    done < <(find "$BACKUP_DIR" -name "lingtong_*.sql.gz" -mtime +${BACKUP_RETENTION_DAYS} -type f 2>/dev/null)

    if [ $deleted_count -gt 0 ]; then
        log_success "已清理 $deleted_count 个旧备份文件"
    else
        log_info "没有需要清理的旧备份"
    fi
}

# 上传到阿里云 OSS（可选）
upload_to_oss() {
    local backup_file="$1"

    if [ "${ENABLE_REMOTE_BACKUP}" != "true" ]; then
        log_info "远程备份未启用，跳过上传"
        return 0
    fi

    if [ -z "${OSS_ENDPOINT}" ] || [ -z "${OSS_ACCESS_KEY_ID}" ]; then
        log_warning "OSS 配置不完整，跳过上传"
        return 0
    fi

    log_info "上传备份到阿里云 OSS..."

    # 计算文件名（包含日期）
    local oss_key="lingtong/backup/$(basename "$backup_file")"

    # 使用 ossutil 上传
    if command -v ossutil &> /dev/null; then
        ossutil cp "$backup_file" "oss://${OSS_BUCKET}/${oss_key}" \
            --endpoint="${OSS_ENDPOINT}" \
            --access-key-id="${OSS_ACCESS_KEY_ID}" \
            --access-key-secret="${OSS_ACCESS_KEY_SECRET}" &> /dev/null

        if [ $? -eq 0 ]; then
            log_success "备份已上传到 OSS: $oss_key"
            return 0
        else
            log_error "OSS 上传失败"
            return 1
        fi
    else
        log_warning "ossutil 未安装，跳过 OSS 上传"
        return 1
    fi
}

# 验证备份完整性
verify_backup() {
    local backup_file="$1"

    log_info "验证备份文件完整性..."

    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在"
        return 1
    fi

    # 检查文件大小
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    if [ "$file_size" -lt 1024 ]; then
        log_error "备份文件过小，可能不完整"
        return 1
    fi

    # 尝试解压验证
    if gzip -t "$backup_file" 2>/dev/null; then
        log_success "备份文件验证通过"
        return 0
    else
        log_error "备份文件损坏"
        return 1
    fi
}

# 显示备份统计
show_stats() {
    log_info "备份统计信息..."

    local total_count=$(find "$BACKUP_DIR" -name "lingtong_*.sql.gz" -type f 2>/dev/null | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

    echo ""
    echo "============================================="
    echo "           备份统计信息"
    echo "============================================="
    echo "备份目录: $BACKUP_DIR"
    echo "备份文件数: $total_count"
    echo "总大小: $total_size"
    echo "保留天数: ${BACKUP_RETENTION_DAYS} 天"
    echo "============================================="
}

# 主函数
main() {
    echo ""
    echo "============================================="
    echo "       栖缘社 数据库备份脚本 v1.0.0"
    echo "============================================="
    echo ""

    load_env

    # 执行备份
    local backup_file
    if backup_file=$(backup_database); then
        if verify_backup "$backup_file"; then
            upload_to_oss "$backup_file"
        fi
    else
        log_error "备份失败"
        exit 1
    fi

    # 清理旧备份
    cleanup_old_backups

    # 显示统计
    show_stats

    log_success "备份任务完成"
}

# 如果直接运行脚本，则执行主函数
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi

#!/bin/bash
# =============================================
# 栖缘社数据库恢复脚本
# 从 backup.sh 生成的 .sql.gz 备份文件恢复数据库
#
# 用法:
#   bash scripts/restore.sh                    # 列出可用备份
#   bash scripts/restore.sh <文件> --yes        # 恢复（--yes 跳过确认，用于自动化/恢复演练）
# =============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO] $(date '+%Y-%m-%d %H:%M:%S') ${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') ${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING] $(date '+%Y-%m-%d %H:%M:%S') ${NC} $1"; }
log_error() { echo -e "${RED}[ERROR] $(date '+%Y-%m-%d %H:%M:%S') ${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_PATH:-${PROJECT_DIR}/backups}"

# 加载环境变量
if [ -f "${PROJECT_DIR}/.env" ]; then
    set -a
    source "${PROJECT_DIR}/.env"
    set +a
fi

DB_NAME="${MYSQL_DATABASE:-lingtong_match}"

list_backups() {
    log_info "可用备份文件（${BACKUP_DIR}）:"
    local count=0
    while IFS= read -r f; do
        echo "  $(basename "$f")  ($(du -h "$f" | cut -f1))"
        count=$((count + 1))
    done < <(find "$BACKUP_DIR" -name "lingtong_*.sql.gz" -type f 2>/dev/null | sort)
    if [ "$count" -eq 0 ]; then
        log_warning "没有找到备份文件"
    fi
}

do_restore() {
    local backup_file="$1"
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi
    if ! docker ps --format '{{.Names}}' | grep -q "^lingtong_mysql$"; then
        log_error "MySQL 容器未运行"
        exit 1
    fi
    if [ -z "${MYSQL_ROOT_PASSWORD:-}" ]; then
        log_error "未设置 MYSQL_ROOT_PASSWORD（请在项目根目录 .env 中配置）"
        exit 1
    fi

    log_info "恢复数据库 ${DB_NAME}，备份文件: $(basename "$backup_file") ($(du -h "$backup_file" | cut -f1))"
    if gunzip -c "$backup_file" | docker exec -i lingtong_mysql mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" "$DB_NAME"; then
        log_success "数据库恢复成功"
    else
        log_error "数据库恢复失败"
        exit 1
    fi
}

main() {
    echo "============================================="
    echo "       栖缘社 数据库恢复脚本 v1.0.0"
    echo "============================================="

    if [ $# -eq 0 ]; then
        list_backups
        echo ""
        echo "用法: bash $0 <备份文件路径> [--yes]"
        echo "  --yes  跳过确认（用于自动化/恢复演练）"
        exit 0
    fi

    local backup_file="$1"
    local skip_confirm=false
    if [ "${2:-}" = "--yes" ] || [ "${2:-}" = "-y" ]; then
        skip_confirm=true
    fi

    if [ "$skip_confirm" = false ]; then
        echo -e "${RED}警告：恢复将覆盖数据库 ${DB_NAME} 现有数据，且不可撤销！${NC}"
        read -r -p "确认恢复？输入 yes 继续: " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "已取消"
            exit 0
        fi
    fi

    do_restore "$backup_file"
}

main "$@"

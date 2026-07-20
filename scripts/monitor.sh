#!/bin/bash
# =============================================
# 栖缘社监控脚本
# 支持：服务状态、磁盘、内存、API响应时间监控
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
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 监控配置（默认值）
DISK_THRESHOLD=${DISK_USAGE_THRESHOLD:-80}
MEMORY_THRESHOLD=${MEMORY_USAGE_THRESHOLD:-85}
API_TIME_THRESHOLD=${API_RESPONSE_TIME_THRESHOLD:-3000}
LOG_FILE="${PROJECT_DIR}/logs/monitor.log"

# 告警状态
ALERT_COUNT=0
ALERT_MESSAGES=()

# 发送告警通知
send_alert() {
    local title="$1"
    local message="$2"
    local level="$3"

    ALERT_COUNT=$((ALERT_COUNT + 1))
    ALERT_MESSAGES+=("[$level] $title: $message")

    log_warning "$title - $message"

    # 发送到企业微信
    if [ -n "${WECHAT_WEBHOOK_URL}" ]; then
        local content="【栖缘社监控告警】
标题: $title
消息: $message
级别: $level
时间: $(date '+%Y-%m-%d %H:%M:%S')
环境: ${NODE_ENV:-production}"

        curl -s -X POST "${WECHAT_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"$content\"}}" 2>/dev/null || true
    fi

    # 发送到钉钉
    if [ -n "${DINGTALK_WEBHOOK_URL}" ]; then
        local content="【栖缘社监控告警】
标题: $title
消息: $message
级别: $level
时间: $(date '+%Y-%m-%d %H:%M:%S')"

        curl -s -X POST "${DINGTALK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"$content\"}}" 2>/dev/null || true
    fi
}

# 检查 Docker 服务状态
check_services() {
    echo ""
    echo "============================================="
    echo "           Docker 服务状态检查"
    echo "============================================="

    local services=("mysql" "redis" "api" "admin" "nginx")
    local all_running=true

    for service in "${services[@]}"; do
        local container_name="lingtong_${service}"
        local status=$(docker inspect -f '{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")

        if [ "$status" == "running" ]; then
            log_success "$service: 运行中"
        else
            log_error "$service: $status"
            all_running=false
            send_alert "服务停止" "$service 服务当前状态: $status" "严重"
        fi
    done

    if $all_running; then
        log_success "所有服务运行正常"
    fi
}

# 检查磁盘空间
check_disk() {
    echo ""
    echo "============================================="
    echo "           磁盘空间检查"
    echo "============================================="

    local disk_usage=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    local disk_available=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $4}')

    echo "使用率: ${disk_usage}%"
    echo "可用空间: $disk_available"

    if [ "$disk_usage" -ge "$DISK_THRESHOLD" ]; then
        log_error "磁盘使用率超过阈值 (${DISK_THRESHOLD}%)"
        send_alert "磁盘空间不足" "磁盘使用率: ${disk_usage}%, 可用: $disk_available" "严重"
    else
        log_success "磁盘空间充足"
    fi
}

# 检查内存使用
check_memory() {
    echo ""
    echo "============================================="
    echo "           内存使用检查"
    echo "============================================="

    local mem_info=$(free -m)
    local total=$(echo "$mem_info" | grep Mem | awk '{print $2}')
    local used=$(echo "$mem_info" | grep Mem | awk '{print $3}')
    local available=$(echo "$mem_info" | grep Mem | awk '{print $7}')
    local usage_percent=$((used * 100 / total))

    echo "总内存: ${total}MB"
    echo "已使用: ${used}MB (${usage_percent}%)"
    echo "可用: ${available}MB"

    if [ "$usage_percent" -ge "$MEMORY_THRESHOLD" ]; then
        log_error "内存使用率超过阈值 (${MEMORY_THRESHOLD}%)"
        send_alert "内存使用率过高" "内存使用: ${usage_percent}% (${used}/${total}MB)" "警告"
    else
        log_success "内存使用正常"
    fi

    # Docker 容器内存使用
    echo ""
    echo "Docker 容器内存使用:"
    for container in $(docker ps --format '{{.Names}}'); do
        local mem=$(docker stats --no-stream --format "{{.MemUsage}}" "$container" 2>/dev/null || echo "N/A")
        echo "  $container: $mem"
    done
}

# 检查 API 响应时间
check_api() {
    echo ""
    echo "============================================="
    echo "           API 响应时间检查"
    echo "============================================="

    local api_url="http://localhost:3000/health"
    local start_time=$(date +%s%3N)

    local response=$(curl -s -o /dev/null -w "%{http_code}" "$api_url" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))

    echo "API 地址: $api_url"
    echo "HTTP 状态: $response"
    echo "响应时间: ${response_time}ms"

    if [ "$response" == "200" ]; then
        if [ "$response_time" -le "$API_TIME_THRESHOLD" ]; then
            log_success "API 响应正常 (${response_time}ms)"
        else
            log_warning "API 响应时间超过阈值 (${API_TIME_THRESHOLD}ms)"
            send_alert "API响应慢" "响应时间: ${response_time}ms, 阈值: ${API_TIME_THRESHOLD}ms" "警告"
        fi
    else
        log_error "API 服务异常 (HTTP $response)"
        send_alert "API服务异常" "HTTP 状态码: $response" "严重"
    fi

    # 检查其他端点
    echo ""
    echo "其他端点检查:"

    local admin_url="http://localhost:3001/index.html"
    local admin_response=$(curl -s -o /dev/null -w "%{http_code}" "$admin_url" 2>/dev/null || echo "000")
    echo "  管理后台: $admin_response"
}

# 检查 MySQL 连接数
check_mysql() {
    echo ""
    echo "============================================="
    echo "           MySQL 连接检查"
    echo "============================================="

    if ! docker ps --format '{{.Names}}' | grep -q "^lingtong_mysql$"; then
        log_error "MySQL 容器未运行"
        return
    fi

    # 获取 MySQL 连接数
    local connections=$(docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T mysql \
        mysql -u root -p"${MYSQL_ROOT_PASSWORD}" \
        -e "SHOW STATUS LIKE 'Threads_connected';" \
        2>/dev/null | grep Threads_connected | awk '{print $2}' || echo "N/A")

    local max_connections=$(docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T mysql \
        mysql -u root -p"${MYSQL_ROOT_PASSWORD}" \
        -e "SHOW VARIABLES LIKE 'max_connections';" \
        2>/dev/null | grep max_connections | awk '{print $2}' || echo "N/A")

    echo "当前连接数: $connections"
    echo "最大连接数: $max_connections"

    if [ "$connections" != "N/A" ] && [ "$max_connections" != "N/A" ]; then
        local usage_percent=$((connections * 100 / max_connections))
        if [ "$usage_percent" -ge 80 ]; then
            log_warning "MySQL 连接使用率: ${usage_percent}%"
            send_alert "MySQL连接数高" "当前连接: $connections, 最大: $max_connections" "警告"
        else
            log_success "MySQL 连接正常"
        fi
    fi
}

# 检查 Redis 内存使用
check_redis() {
    echo ""
    echo "============================================="
    echo "           Redis 内存检查"
    echo "============================================="

    if ! docker ps --format '{{.Names}}' | grep -q "^lingtong_redis$"; then
        log_error "Redis 容器未运行"
        return
    fi

    local redis_info=$(docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T redis \
        redis-cli -a "${REDIS_PASSWORD}" INFO memory 2>/dev/null | grep -E "used_memory_human|maxmemory_human" || echo "")

    if [ -n "$redis_info" ]; then
        echo "$redis_info" | while IFS=':' read -r key value; do
            echo "  $key: $value"
        done
    fi
}

# 显示监控报告
show_report() {
    echo ""
    echo "============================================="
    echo "           监控报告 - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "============================================="

    if [ $ALERT_COUNT -gt 0 ]; then
        echo ""
        echo -e "${RED}检测到 $ALERT_COUNT 个告警:${NC}"
        for msg in "${ALERT_MESSAGES[@]}"; do
            echo "  $msg"
        done
        echo ""
        log_error "监控发现 $ALERT_COUNT 个问题，请及时处理"
    else
        log_success "所有监控项正常"
    fi

    # 记录到日志
    if [ $ALERT_COUNT -gt 0 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $ALERT_COUNT issues detected" >> "$LOG_FILE"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: All checks passed" >> "$LOG_FILE"
    fi

    echo "============================================="
}

# 主函数
main() {
    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"

    # 加载环境变量
    if [ -f "${PROJECT_DIR}/.env" ]; then
        set -a
        source "${PROJECT_DIR}/.env"
        set +a
    fi

    echo ""
    echo "============================================="
    echo "       栖缘社 监控脚本 v1.0.0"
    echo "============================================="

    # 执行各项检查
    check_services
    check_disk
    check_memory
    check_api
    check_mysql
    check_redis

    # 显示报告
    show_report

    # 返回状态码
    if [ $ALERT_COUNT -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# 如果直接运行脚本，则执行主函数
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi

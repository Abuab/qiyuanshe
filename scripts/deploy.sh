#!/bin/bash
# =============================================
# 栖缘社一键部署脚本
# 支持：代码拉取、构建、启动、健康检查
# =============================================

# 设置错误退出
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 进入项目目录
cd "$PROJECT_DIR"

# 显示标题
echo "============================================="
echo "       栖缘社 一键部署脚本 v1.0.0"
echo "============================================="

# 检查 Docker 和 Docker Compose
check_docker() {
    log_info "检查 Docker 环境..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        echo "安装命令：curl -fsSL https://get.docker.com | sh"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装"
        echo "安装命令：apt install docker-compose"
        exit 1
    fi

    if ! docker --version &> /dev/null; then
        log_error "Docker 无法正常运行"
        exit 1
    fi

    log_success "Docker 环境检查通过"
}

# 加载环境变量
load_env() {
    log_info "加载环境变量..."

    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
        log_success "环境变量加载成功"
    else
        if [ -f .env.example ]; then
            log_warning ".env 文件不存在，复制 .env.example 为 .env"
            cp .env.example .env
            log_warning "请编辑 .env 文件配置必要的环境变量"
            exit 1
        else
            log_error ".env 和 .env.example 文件都不存在"
            exit 1
        fi
    fi
}

# 备份数据库
backup_database() {
    log_info "备份数据库..."

    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"

    BACKUP_FILE="${BACKUP_DIR}/lingtong_$(date +%Y%m%d_%H%M%S).sql"

    if docker-compose exec -T mysql mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" --single-transaction --routines --triggers lingtong_match > "$BACKUP_FILE" 2>/dev/null; then
        # 压缩备份文件
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        log_success "数据库备份成功: $BACKUP_FILE"
    else
        log_warning "数据库备份失败，继续部署..."
    fi

    # 清理旧备份（保留30天）
    find "$BACKUP_DIR" -name "lingtong_*.sql.gz" -mtime +30 -delete 2>/dev/null
}

# 拉取最新代码（可选）
pull_code() {
    if [ -d ".git" ]; then
        read -p "是否拉取最新代码？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "拉取最新代码..."
            git pull origin main
            log_success "代码拉取成功"
        fi
    fi
}

# 构建并启动容器
build_and_start() {
    log_info "构建并启动 Docker 容器..."

    # 确保 nginx.conf 存在（Docker 可能创建了同名目录，先删除）
    if [ -d "docker/nginx/nginx.conf" ]; then
        log_info "检测到 nginx.conf 是目录（Docker 自动创建），删除中..."
        rm -rf docker/nginx/nginx.conf
    fi
    if [ ! -f "docker/nginx/nginx.conf" ] && [ -f "docker/nginx/nginx.conf.example" ]; then
        log_info "首次部署：复制 nginx.conf.example → docker/nginx/nginx.conf"
        cp docker/nginx/nginx.conf.example docker/nginx/nginx.conf
    fi

    # 停止现有容器（保留数据卷）
    docker-compose down --remove-orphans 2>/dev/null || true

    # 构建并启动容器
    docker-compose up -d --build

    log_success "容器启动成功"
}

# 等待服务启动
wait_for_services() {
    log_info "等待服务启动（10秒）..."
    sleep 10
}

# 健康检查
health_check() {
    log_info "开始健康检查..."

    # 检查 MySQL
    log_info "检查 MySQL..."
    for i in {1..30}; do
        if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" &> /dev/null; then
            log_success "MySQL 运行正常"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "MySQL 启动失败"
            exit 1
        fi
        sleep 2
    done

    # 检查 Redis
    log_info "检查 Redis..."
    for i in {1..30}; do
        if docker-compose exec -T redis redis-cli -a "${REDIS_PASSWORD}" ping &> /dev/null; then
            log_success "Redis 运行正常"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Redis 启动失败"
            exit 1
        fi
        sleep 2
    done

    # 检查 API
    log_info "检查 API 服务..."
    for i in {1..30}; do
        if curl -sf http://localhost:3000/health &> /dev/null; then
            log_success "API 服务运行正常"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "API 服务启动失败"
            exit 1
        fi
        sleep 2
    done
}

# 显示部署结果
show_result() {
    echo ""
    echo "============================================="
    echo "           部署完成！服务状态："
    echo "============================================="
    docker-compose ps

    echo ""
    echo "============================================="
    echo "           访问地址："
    echo "============================================="
    echo -e "API 服务:   ${GREEN}http://localhost:3000${NC}"
    echo -e "管理后台:   ${GREEN}http://localhost:3001${NC}"
    echo -e "健康检查:   ${GREEN}http://localhost:3000/health${NC}"

    if [ -n "$SERVER_HOST" ]; then
        echo ""
        echo -e "外部访问:"
        echo -e "API 服务:   ${GREEN}https://api.${SERVER_HOST}${NC}"
        echo -e "管理后台:   ${GREEN}https://admin.${SERVER_HOST}${NC}"
    fi

    echo ""
    echo "============================================="
    echo "           常用命令："
    echo "============================================="
    echo "查看日志: docker-compose logs -f [服务名]"
    echo "重启服务: docker-compose restart [服务名]"
    echo "停止服务: docker-compose down"
    echo "============================================="
}

# 清理函数
cleanup() {
    # 删除临时文件
    rm -f /tmp/lingtong_deploy_*.log
}

# 主函数
main() {
    trap cleanup EXIT

    check_docker
    load_env
    backup_database
    pull_code
    build_and_start
    wait_for_services
    health_check
    show_result
}

# 执行主函数
main "$@"

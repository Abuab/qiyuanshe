#!/bin/bash
# =============================================
# 栖缘社一键安装脚本
# 支持：Ubuntu 20.04+ / CentOS 7+
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

# 检查操作系统
check_os() {
    log_info "检查操作系统..."

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "无法识别操作系统"
        exit 1
    fi

    case "$OS" in
        ubuntu)
            if [ "$(echo "$VERSION < 20.04" | bc)" 2>/dev/null || echo "$VERSION" | grep -q "20.04\|22.04\|24.04" ]; then
                log_success "检测到 Ubuntu $VERSION"
            else
                log_warning "Ubuntu $VERSION 未经过测试，建议使用 Ubuntu 20.04+"
            fi
            ;;
        centos)
            if [ "$(echo "$VERSION < 7" | bc)" 2>/dev/null ]; then
                log_error "CentOS $VERSION 不支持，请使用 CentOS 7+"
                exit 1
            fi
            log_success "检测到 CentOS $VERSION"
            ;;
        *)
            log_warning "操作系统 $OS 未经过测试，尝试继续..."
            ;;
    esac
}

# 检查 root 权限
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 权限运行此脚本"
        echo "运行命令: sudo bash $0"
        exit 1
    fi
}

# 安装 Docker
install_docker() {
    log_info "检查 Docker..."

    if command -v docker &> /dev/null; then
        log_success "Docker 已安装: $(docker --version)"
        return 0
    fi

    log_info "安装 Docker..."

    case "$OS" in
        ubuntu|centos)
            curl -fsSL https://get.docker.com | sh
            systemctl enable docker
            systemctl start docker
            ;;
        *)
            log_error "不支持的操作系统"
            exit 1
            ;;
    esac

    # 添加 docker 组
    groupadd -f docker

    log_success "Docker 安装完成: $(docker --version)"
}

# 安装 Docker Compose
install_docker_compose() {
    log_info "检查 Docker Compose..."

    if command -v docker compose &> /dev/null; then
        log_success "Docker Compose 已安装: $(docker compose --version)"
        return 0
    fi

    log_info "安装 Docker Compose..."

    # 下载最新版本的 Docker Compose
    local latest_version=$(curl -s https://api.github.com/repos/docker/compose/releases/latest 2>/dev/null | grep -oP '"tag_name": "\K[^"]+' || echo "v2.24.0")
    local version="${latest_version#v}"

    curl -L "https://github.com/docker/compose/releases/download/${latest_version}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose 2>/dev/null || \
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose

    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

    log_success "Docker Compose 安装完成: $(docker compose --version)"
}

# 创建项目目录结构
create_directories() {
    log_info "创建项目目录结构..."

    cd "$PROJECT_DIR"

    # 创建必要目录
    mkdir -p backups
    mkdir -p logs
    mkdir -p certs
    mkdir -p docker/mysql
    mkdir -p docker/nginx/ssl
    mkdir -p scripts

    # 设置权限
    chmod 755 backups logs certs docker docker/mysql docker/nginx docker/nginx/ssl scripts

    log_success "目录结构创建完成"
}

# 生成 .env 文件
generate_env() {
    log_info "生成环境配置文件..."

    if [ -f "$PROJECT_DIR/.env" ]; then
        read -p ".env 文件已存在，是否覆盖？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "保留现有的 .env 文件"
            return 0
        fi
    fi

    # 复制示例文件
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    fi

    # 生成随机密码（使用 od 替代 xxd，兼容性更好）
    local random_suffix=$(head -c 4 /dev/urandom | od -An -tx1 | tr -d ' \n')
    local db_password="lingtong_${random_suffix}"
    local redis_password="lingtong_${random_suffix}"
    local jwt_secret=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')

    # 更新 .env 文件
    sed -i "s/^MYSQL_ROOT_PASSWORD=.*/MYSQL_ROOT_PASSWORD=${db_password}_root/" "$PROJECT_DIR/.env" 2>/dev/null || true
    sed -i "s/^MYSQL_PASSWORD=.*/MYSQL_PASSWORD=${db_password}/" "$PROJECT_DIR/.env" 2>/dev/null || true
    sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=${redis_password}/" "$PROJECT_DIR/.env" 2>/dev/null || true
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${jwt_secret}/" "$PROJECT_DIR/.env" 2>/dev/null || true

    log_success ".env 文件已生成，请编辑以下内容:"
    echo "  - 微信小程序配置 (WECHAT_APPID, WECHAT_SECRET)"
    echo "  - 微信支付配置 (WECHAT_MCH_ID, WECHAT_API_V3_KEY)"
    echo "  - 腾讯云配置 (TENCENT_SECRET_ID, TENCENT_SECRET_KEY)"
    echo "  - 服务器域名 (SERVER_HOST)"
}

# 设置脚本权限
set_permissions() {
    log_info "设置脚本执行权限..."

    chmod +x "$PROJECT_DIR"/scripts/*.sh
    chmod +x "$PROJECT_DIR"/deploy.sh 2>/dev/null || true

    log_success "脚本权限设置完成"
}

# 启动服务
start_services() {
    log_info "启动 Docker 服务..."

    # 重新加载 systemd（如果需要）
    systemctl daemon-reload 2>/dev/null || true

    # 启动 Docker
    systemctl enable docker 2>/dev/null || true
    systemctl start docker 2>/dev/null || true

    # 检查 Docker 状态
    if ! systemctl is-active docker &> /dev/null; then
        log_error "Docker 服务启动失败"
        exit 1
    fi

    cd "$PROJECT_DIR"

    # 确保 nginx.conf 存在（Docker 可能创建了同名目录，先删除）
    if [ -d "docker/nginx/nginx.conf" ]; then
        log_info "检测到 nginx.conf 是目录（Docker 自动创建），删除中..."
        sudo rm -rf docker/nginx/nginx.conf
    fi
    if [ ! -f "docker/nginx/nginx.conf" ] && [ -f "docker/nginx/nginx.conf.example" ]; then
        log_info "复制 nginx.conf.example → docker/nginx/nginx.conf"
        cp docker/nginx/nginx.conf.example docker/nginx/nginx.conf
    fi

    # 构建并启动容器
    log_info "构建并启动容器（首次构建可能需要几分钟）..."
    docker compose up -d --build

    log_success "容器启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务启动（30秒）..."

    local max_wait=30
    local waited=0

    while [ $waited -lt $max_wait ]; do
        if curl -sf http://localhost:3000/health &>/dev/null; then
            log_success "API 服务已就绪"
            break
        fi
        sleep 2
        waited=$((waited + 2))
    done

    if [ $waited -ge $max_wait ]; then
        log_warning "服务启动可能需要更长时间，请稍后检查"
    fi
}

# 显示安装结果
show_result() {
    echo ""
    echo "============================================="
    echo "           安装完成！"
    echo "============================================="
    echo ""
    echo "访问地址:"
    echo -e "  API 服务:   ${GREEN}http://localhost:3000${NC}"
    echo -e "  管理后台:   ${GREEN}http://localhost:3001${NC}"
    echo -e "  健康检查:   ${GREEN}http://localhost:3000/health${NC}"
    echo ""
    echo "默认账号:"
    echo "  用户名: admin"
    echo "  密码: admin123 (首次登录后请修改)"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker compose logs -f"
    echo "  重启服务: docker compose restart"
    echo "  停止服务: docker compose down"
    echo "  更新部署: bash scripts/deploy.sh"
    echo ""
    echo "配置文件位置:"
    echo "  环境变量: $PROJECT_DIR/.env"
    echo "  Nginx配置: $PROJECT_DIR/docker/nginx/nginx.conf"
    echo "  MySQL配置: $PROJECT_DIR/docker/mysql/my.cnf"
    echo ""
    echo "============================================="
}

# 主函数
main() {
    echo ""
    echo "============================================="
    echo "       栖缘社 一键安装脚本 v1.0.0"
    echo "============================================="
    echo ""

    check_root
    check_os
    install_docker
    install_docker_compose
    create_directories
    generate_env
    set_permissions
    start_services
    wait_for_services
    show_result

    log_success "安装完成！"
}

# 执行主函数
main "$@"

#!/bin/bash
# =============================================
# 栖缘社 SSL 证书申请 & 自动续期脚本
# 域名从项目根目录 .env 中读取 DOMAIN 变量
# 使用 Let's Encrypt + certbot
# =============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SSL_DIR="$PROJECT_DIR/docker/nginx/ssl"
CERTBOT_WWW="$PROJECT_DIR/docker/nginx/certbot/www"

# 从项目 .env 读取域名，不存在则提示用户设置
if [ -f "$PROJECT_DIR/.env" ]; then
    DOMAIN=$(grep -E '^DOMAIN=' "$PROJECT_DIR/.env" | cut -d'=' -f2-)
    H5_DOMAIN=$(grep -E '^H5_DOMAIN=' "$PROJECT_DIR/.env" | cut -d'=' -f2-)
fi
if [ -z "$DOMAIN" ]; then
    log_error "请在项目根目录 .env 中设置 DOMAIN=yourdomain.com"
    exit 1
fi

# 构建 certbot 域名参数：主域名始终排第一（certbot live 目录名取第一个 -d 域名）
DOMAINS_ARGS=(-d "$DOMAIN")
if [ -n "$H5_DOMAIN" ]; then
    DOMAINS_ARGS+=(-d "$H5_DOMAIN")
    log_info "检测到 H5_DOMAIN=$H5_DOMAIN，将与主域名 $DOMAIN 签入同一张 SAN 证书"
fi
# certbot 证书目录名（取第一个 -d 域名，即主域名）
CERT_DIR_NAME="$DOMAIN"

# 从项目 .env 读取邮箱，不存在则使用占位符（Let's Encrypt 要求有效邮箱）
SSL_EMAIL=$(grep -E '^SSL_EMAIL=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
if [ -z "$SSL_EMAIL" ]; then
    SSL_EMAIL="admin@$DOMAIN"
    log_warning "未在 .env 中设置 SSL_EMAIL，将使用: $SSL_EMAIL"
fi

# =============================================
# 0. 检测操作系统包管理器
# =============================================
detect_pkg_manager() {
    if command -v dnf &> /dev/null; then
        echo "dnf"
    elif command -v yum &> /dev/null; then
        echo "yum"
    elif command -v apt &> /dev/null; then
        echo "apt"
    else
        echo ""
    fi
}

# =============================================
# 1. 安装 certbot（兼容 Ubuntu/Debian/CentOS/RHEL）
# =============================================
install_certbot() {
    if command -v certbot &> /dev/null; then
        log_success "certbot 已安装"
        return
    fi

    local PKG
    PKG=$(detect_pkg_manager)

    log_info "检测到包管理器: ${PKG:-未知}，开始安装 certbot..."

    case "$PKG" in
        dnf|yum)
            # CentOS / RHEL / Fedora — 先启用 EPEL 再装 certbot
            sudo $PKG install -y epel-release 2>/dev/null || true
            sudo $PKG install -y certbot
            ;;
        apt)
            # Ubuntu / Debian
            sudo apt update -y
            sudo apt install -y certbot
            ;;
        *)
            log_error "未检测到 dnf/yum/apt，请手动安装 certbot"
            log_info "参考: https://certbot.eff.org/instructions"
            exit 1
            ;;
    esac

    log_success "certbot 安装完成"
}

# =============================================
# 2. 首次申请证书（standalone 模式，需先停 nginx）
# =============================================
apply_cert_standalone() {
    log_info "首次申请证书（standalone 模式）..."

    # 停止占用 80 端口的服务（Docker nginx 容器）
    log_info "临时停止 nginx 容器以释放 80 端口..."
    cd "$PROJECT_DIR"
    docker compose stop nginx 2>/dev/null || true

    # 无论后续成功与否，退出时都恢复 nginx，避免「80 端口关闭后起不来」
    restore_nginx() {
        log_info "恢复 nginx 容器..."
        docker compose up -d nginx 2>/dev/null || true
    }
    trap restore_nginx EXIT

    # 创建 SSL 目录
    sudo mkdir -p "$SSL_DIR"

    # 申请证书
    if ! sudo certbot certonly \
        --standalone \
        --preferred-challenges http \
        --agree-tos \
        --no-eff-email \
        --email "$SSL_EMAIL" \
        "${DOMAINS_ARGS[@]}"; then
        log_error "证书申请失败，nginx 容器已自动恢复"
        log_error "常见原因：1) 域名 DNS 未解析到本机 2) 80 端口仍被占用 3) 域名未备案被拦截"
        exit 1
    fi

    log_success "证书申请成功"

    # 复制证书到项目目录
    sudo cp /etc/letsencrypt/live/$CERT_DIR_NAME/fullchain.pem "$SSL_DIR/fullchain.pem"
    sudo cp /etc/letsencrypt/live/$CERT_DIR_NAME/privkey.pem "$SSL_DIR/privkey.pem"
    sudo chmod 644 "$SSL_DIR/fullchain.pem"
    sudo chmod 600 "$SSL_DIR/privkey.pem"

    log_success "证书已复制到 $SSL_DIR"

    # 重启 nginx
    log_info "启动 nginx 容器..."
    docker compose up -d nginx

    # 已手动恢复 nginx，清除 trap 避免退出时重复执行
    trap - EXIT

    log_success "Nginx 已重启，SSL 已生效"
}

# =============================================
# 3. 安装续期钩子 & 定时任务（webroot 模式）
# =============================================
setup_renewal() {
    log_info "配置证书自动续期..."

    # 创建续期钩子脚本
    sudo mkdir -p "$CERTBOT_WWW"

    sudo tee /etc/letsencrypt/renewal-hooks/deploy/copy-qys-certs.sh > /dev/null << HOOK
#!/bin/bash
# Let's Encrypt 续期后自动复制证书并重载 nginx

SSL_DIR="$SSL_DIR"
CERT_DIR_NAME="$CERT_DIR_NAME"

cp /etc/letsencrypt/live/\$CERT_DIR_NAME/fullchain.pem "\$SSL_DIR/fullchain.pem"
cp /etc/letsencrypt/live/\$CERT_DIR_NAME/privkey.pem "\$SSL_DIR/privkey.pem"
chmod 644 "\$SSL_DIR/fullchain.pem"
chmod 600 "\$SSL_DIR/privkey.pem"

# 重载 nginx 使新证书生效
cd "$PROJECT_DIR"
docker compose exec -T nginx nginx -s reload

echo "\$(date '+%Y-%m-%d %H:%M:%S') SSL certificate renewed and nginx reloaded" >> /var/log/qys-ssl-renewal.log
HOOK

    sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/copy-qys-certs.sh

    # 添加定时任务（每天凌晨 2 点检查并续期）
    CRON_JOB="0 2 * * * certbot renew --quiet --webroot -w $CERTBOT_WWW"
    (sudo crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_JOB") | sudo crontab -

    log_success "自动续期已配置完成"
    log_info "定时任务: 每天凌晨 2:00 检查证书续期"
    log_info "续期日志: /var/log/qys-ssl-renewal.log"
}

# =============================================
# 4. 手动续期（测试用）
# =============================================
renew_now() {
    log_info "手动检查并续期证书..."
    sudo certbot renew \
        --quiet \
        --webroot \
        -w "$CERTBOT_WWW" \
        --deploy-hook "/etc/letsencrypt/renewal-hooks/deploy/copy-qys-certs.sh"
    log_success "续期检查完成"
}

# =============================================
# 主流程
# =============================================
case "${1:-}" in
    install)
        install_certbot
        ;;
    apply)
        install_certbot
        apply_cert_standalone
        ;;
    setup-renewal)
        setup_renewal
        ;;
    renew)
        renew_now
        ;;
    *)
        echo "============================================"
        echo "  栖缘社 SSL 证书管理脚本"
        echo "============================================"
        echo ""
        echo "用法: $0 <命令>"
        echo ""
        echo "命令:"
        echo "  install        仅安装 certbot"
        echo "  apply          首次申请证书（standalone 模式）"
        echo "  setup-renewal  配置自动续期（定时任务 + webroot）"
        echo "  renew          手动执行一次续期检查"
        echo ""
        echo "完整流程:"
        echo "  $0 apply         ← 首次申请证书"
        echo "  $0 setup-renewal ← 配置自动续期"
        echo ""
        echo "验证 SSL:"
        echo "  curl -I https://$DOMAIN"
        ;;
esac

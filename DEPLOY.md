# 栖缘社婚恋平台 - 部署文档

## 一、服务器要求

### 硬件配置
| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 硬盘 | 50GB | 100GB+ SSD |
| 带宽 | 5Mbps | 10Mbps+ |

### 软件环境
- **操作系统**: Ubuntu 22.04 LTS (推荐) / CentOS 7+ / Debian 11+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.0+

---

## 二、域名准备

### 所需域名
| 域名 | 用途 | 说明 |
|------|------|------|
| api.lingtong.com | 后端 API 服务 | 解析到服务器 IP |
| admin.lingtong.com | 管理后台 | 解析到服务器 IP |

### DNS 配置
```
A 记录    api.lingtong.com    -> 服务器IP
A 记录    admin.lingtong.com  -> 服务器IP
```

---

## 三、服务器初始化

### 1. 连接服务器
```bash
ssh root@服务器IP
```

### 2. 更新系统
```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS
yum update -y
```

### 3. 安装基础工具
```bash
apt install -y curl wget git vim unzip certbot nginx
```

### 4. 关闭防火墙（可选，生产环境建议配置防火墙规则）
```bash
# Ubuntu
ufw disable

# CentOS
systemctl stop firewalld
systemctl disable firewalld
```

---

## 四、安装 Docker

### 方式一：自动安装脚本（推荐）
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### 方式二：手动安装
```bash
# 安装必要依赖
apt install -y apt-transport-https ca-certificates gnupg lsb-release

# 添加 Docker GPG 密钥
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 添加 Docker 仓库
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
systemctl enable docker
systemctl start docker
```

### 验证安装
```bash
docker --version
docker compose version
```

---

## 五、SSL 证书申请

### 申请 Let's Encrypt 免费证书
```bash
# 停止 nginx（如果正在运行）
systemctl stop nginx

# 申请证书（请将邮箱和域名替换为实际值）
certbot certonly --standalone -d api.lingtong.com -d admin.lingtong.com \
  --email your-email@example.com --agree-tos --no-eff-email --manual --preferred-challenges dns

# 证书存放位置
# /etc/letsencrypt/live/api.lingtong.com/fullchain.pem
# /etc/letsencrypt/live/api.lingtong.com/privkey.pem
```

### 自动续期设置
```bash
# 测试续期
certbot renew --dry-run

# 添加定时任务（每天凌晨检查续期）
echo "0 0 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'" >> /etc/crontab
```

---

## 六、项目部署

### 1. 创建项目目录
```bash
mkdir -p /opt/lingtong
cd /opt/lingtong
```

### 2. 上传项目代码

**方式一：Git 拉取**
```bash
git clone https://your-repo-url/lingtong-match.git .
```

**方式二：SCP 上传**
```bash
# 在本地执行
scp -r ./lingtong-match root@服务器IP:/opt/
```

### 3. 创建必要目录
```bash
mkdir -p backups docker/nginx/ssl docker/mysql/uploads
chmod 755 backups docker/nginx/ssl docker/mysql/uploads
```

### 4. 复制 SSL 证书
```bash
cp /etc/letsencrypt/live/api.lingtong.com/fullchain.pem /opt/lingtong/docker/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/api.lingtong.com/privkey.pem /opt/lingtong/docker/nginx/ssl/key.pem
chmod 644 /opt/lingtong/docker/nginx/ssl/*.pem
```

### 5. 配置环境变量
```bash
cd /opt/lingtong
cp .env.example .env
vim .env
```

**`.env` 文件配置示例：**
```env
#=========================================
# 数据库配置
#=========================================
MYSQL_ROOT_PASSWORD=your_mysql_root_password
MYSQL_DATABASE=lingtong_match
MYSQL_USER=lingtong
MYSQL_PASSWORD=your_mysql_password

#=========================================
# Redis 配置
#=========================================
REDIS_PASSWORD=your_redis_password

#=========================================
# 后端服务配置
#=========================================
NODE_ENV=production
PORT=3000

# JWT 密钥（请使用复杂的随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

#=========================================
# 微信小程序配置
#=========================================
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret

#=========================================
# 微信支付配置
#=========================================
WECHAT_MCH_ID=your_merchant_id
WECHAT_API_V3_KEY=your_api_v3_key
WECHAT_NOTIFY_URL=https://api.lingtong.com/payment/notify

#=========================================
# 腾讯云配置（内容审核）
#=========================================
TENCENTCLOUD_SECRET_ID=your_secret_id
TENCENTCLOUD_SECRET_KEY=your_secret_key

#=========================================
# OSS 配置（可选，用于备份到云存储）
#=========================================
OSS_ENDPOINT=oss-cn-shanghai.aliyuncs.com
OSS_ACCESS_KEY_ID=your_access_key
OSS_ACCESS_KEY_SECRET=your_access_secret
OSS_BUCKET=your_bucket_name

#=========================================
# 告警配置（企业微信/钉钉）
#=========================================
WECHAT_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
```

### 6. 构建并启动服务
```bash
cd /opt/lingtong

# 构建并启动所有服务
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 7. 初始化数据库
```bash
# 等待 MySQL 启动完成（约30秒）
sleep 30

# 执行初始化 SQL
docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" lingtong_match < docker/mysql/init.sql

# 验证表创建
docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "USE lingtong_match; SHOW TABLES;"
```

---

## 七、配置 Nginx 反向代理

### 启动 Nginx
```bash
docker compose up -d nginx
```

### 验证配置
```bash
# 检查 Nginx 配置语法
docker compose exec nginx nginx -t

# 检查服务健康状态
curl -I https://api.lingtong.com/health
curl -I https://admin.lingtong.com
```

---

## 八、配置开机自启

### 创建 systemd 服务文件
```bash
cat > /etc/systemd/system/lingtong.service << EOF
[Unit]
Description=Lingtong Match Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/lingtong
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
```

### 启用服务
```bash
systemctl daemon-reload
systemctl enable lingtong.service
```

---

## 九、定时任务配置

### 编辑 crontab
```bash
crontab -e
```

### 添加以下任务
```cron
# 数据库每日备份（凌晨2点）
0 2 * * * cd /opt/lingtong && ./scripts/backup.sh >> /var/log/backup.log 2>&1

# 日志清理（凌晨3点）
0 3 * * * cd /opt/lingtong && ./scripts/cleanup.sh >> /var/log/cleanup.log 2>&1

# 监控检查（每5分钟）
*/5 * * * * cd /opt/lingtong && ./scripts/monitor.sh >> /var/log/monitor.log 2>&1

# SSL 证书续期（每天凌晨）
0 0 * * * certbot renew --quiet --deploy-hook "docker compose exec -T nginx nginx -s reload"
```

---

## 十、常见问题排查

### 1. 服务无法启动
```bash
# 查看所有容器状态
docker compose ps -a

# 查看具体服务日志
docker compose logs mysql
docker compose logs redis
docker compose logs api

# 重启服务
docker compose restart api
```

### 2. 数据库连接失败
```bash
# 检查 MySQL 是否运行
docker compose exec mysql mysqladmin ping -h localhost -u root -p"$MYSQL_ROOT_PASSWORD"

# 检查网络连接
docker compose exec api ping -c 3 mysql
docker compose exec api ping -c 3 redis
```

### 3. 前端无法访问
```bash
# 检查 Nginx 日志
docker compose logs nginx

# 检查端口占用
netstat -tlnp | grep -E '80|443'
```

### 4. 重新初始化数据库
```bash
# 停止服务
docker compose down

# 删除数据卷（注意：会删除所有数据）
docker compose down -v

# 重新启动（会自动执行 init.sql）
docker compose up -d

# 重新初始化数据
sleep 30
docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" lingtong_match < docker/mysql/init.sql
```

---

## 十一、安全加固建议

### 1. 修改默认密码
- 立即修改 `.env` 中的所有密码
- 使用 `openssl rand -base64 32` 生成强密码

### 2. 配置防火墙
```bash
# 只开放必要端口
ufw allow 22    # SSH
ufw allow 80     # HTTP
ufw allow 443    # HTTPS
ufw enable
```

### 3. 限制 Docker 日志大小
```bash
# 编辑 /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# 重启 Docker
systemctl restart docker
```

### 4. 定期更新
```bash
# 定期更新系统和 Docker
apt update && apt upgrade -y
docker compose pull
docker compose up -d --build
```

---

## 十二、服务访问地址

部署完成后，通过以下地址访问：

| 服务 | 地址 | 说明 |
|------|------|------|
| 管理后台 | https://admin.lingtong.com | 管理员操作界面 |
| 后端 API | https://api.lingtong.com | 小程序/前端调用 |
| 健康检查 | https://api.lingtong.com/health | 服务状态检查 |

### 默认管理员账号
- 用户名: `admin`
- 密码: `admin123`（请立即修改）

---

## 十三、快速命令汇总

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启所有服务
docker compose restart

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f [服务名]

# 进入容器
docker compose exec [服务名] sh

# 更新代码后重新构建
git pull
docker compose up -d --build

# 备份数据库
./scripts/backup.sh

# 查看监控报告
./scripts/monitor.sh
```

---

*文档版本: v1.0*
*最后更新: 2026-05-31*

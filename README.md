# 栖缘社 - 婚恋交友平台

基于 Vue3 + NestJS + TypeScript 的现代化婚恋交友小程序后端管理系统。

## 项目简介

栖缘社是一款面向婚恋场景的小程序平台，提供用户管理、红娘服务、问答社区、会员订阅、支付功能等完整的婚恋解决方案。

## 功能模块

### C端小程序功能
- **用户系统**: 微信授权登录、个人资料管理、照片上传认证
- **即时通讯**: 站内私信、HTTP 轮询聊天、消息已读状态
- **AI 缘分匹配**: 资料完整度评估、AI 分析缘分报告、双方匹配建议
- **问答社区**: 热门问题发布、回答互动、点赞评论
- **红娘服务**: 专业红娘推荐、一对一匹配服务
- **会员体系**: 黄金/钻石/至尊VIP多种会员等级
- **分享海报**: 个性化分享海报生成与追踪

### 管理后台功能
- **用户管理**: 用户列表、资料审核、状态管理、VIP管理
- **聊天监控**: 实时 WebSocket 消息推送、多管理员会话订阅、并发冲突锁
- **内容审核**: 腾讯云 AI 审核 + 本地敏感词过滤（51K+ 词库）+ 人工复核（照片/回答/聊天消息/用户资料）
- **审核通知**: 企业微信/飞书/钉钉 Webhook 实时推送违规内容通知
- **红娘管理**: 红娘资料编辑、排序、状态管理
- **问答管理**: 问题发布、回答管理、热门问题配置
- **订单管理**: 会员订单查询、退款处理、营收统计
- **系统配置**: 小程序配置、分享配置、支付配置、审核配置、敏感词远程拉取

## 技术栈

### 后端
- **框架**: NestJS 10.x
- **语言**: TypeScript 5.x
- **数据库**: MySQL 8.0
- **缓存**: Redis 7.x
- **ORM**: TypeORM
- **认证**: JWT + 微信授权

### 前端（管理后台）
- **框架**: Vue3 3.x
- **语言**: TypeScript 5.x
- **构建工具**: Vite 5.x
- **UI框架**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router 4

### 基础设施
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **SSL**: Let's Encrypt

## 项目结构

```
qiyuanshe/
├── admin/                    # 管理后台前端
│   ├── src/
│   │   ├── api/             # API 接口定义
│   │   ├── components/       # 公共组件
│   │   ├── router/           # 路由配置
│   │   ├── store/            # 状态管理
│   │   ├── styles/           # 全局样式
│   │   └── views/            # 页面组件
│   │       ├── audit/        # 审核管理
│   │       ├── matchmaker/   # 红娘管理
│   │       ├── payment/      # 订单管理
│   │       ├── question/     # 问答管理
│   │       ├── system/       # 系统配置
│   │       └── user/         # 用户管理
│   ├── Dockerfile
│   ├── nginx.conf.example # 管理后台 Nginx 模板
│   └── package.json
│
├── backend/                  # 后端服务
│   ├── src/
│   │   ├── admin/            # 管理后台 API
│   │   ├── audit/            # 内容审核模块
│   │   ├── auth/             # 认证授权
│   │   ├── chat/             # 即时通讯
│   │   ├── common/           # 公共模块
│   │   ├── config/           # 配置文件
│   │   ├── entities/         # 数据库实体
│   │   ├── payment/          # 支付模块
│   │   ├── poster/           # 海报生成
│   │   ├── question/         # 问答模块
│   │   ├── system/           # 系统配置
│   │   ├── user/             # 用户模块
│   │   └── app.module.ts
│   ├── Dockerfile
│   └── package.json
│
├── config/                   # 应用配置数据
│   └── sensitive-words/      # 敏感词库（来自 Sensitive-lexicon）
│       ├── 色情词库.txt
│       ├── 政治类型.txt
│       ├── 广告类型.txt
│       ├── 暴恐词库.txt
│       ├── 反动词库.txt
│       ├── 贪腐词库.txt
│       ├── 民生词库.txt
│       ├── 涉枪涉爆.txt
│       ├── 非法网址.txt
│       ├── 零时-Tencent.txt
│       ├── GFW补充词库.txt
│       ├── 网易前端过滤敏感词库.txt
│       ├── 补充词库.txt
│       ├── 其他词库.txt
│       ├── COVID-19词库.txt
│       ├── 新思想启蒙.txt
│       ├── _all.txt          # 合并去重文件（51K+ 唯一词）
│       └── sensitive-words.json # JSON 格式兜底文件
│
├── docker/                   # Docker 配置文件
│   ├── mysql/
│   │   ├── init.sql          # 数据库初始化
│   │   └── my.cnf            # MySQL 配置
│   └── nginx/
│       ├── nginx.conf.example # Nginx 配置模板（复制为 nginx.conf 后修改）
│       ├── ssl/              # SSL 证书目录
│       └── certbot/          # Certbot 验证目录
│
├── scripts/                  # 运维脚本
│   ├── deploy.sh             # 一键部署
│   ├── setup-ssl.sh          # SSL 证书申请 & 自动续期
│   ├── backup.sh             # 数据库备份
│   ├── cleanup.sh            # 日志清理
│   ├── monitor.sh            # 监控告警
│   └── install.sh            # 环境安装
│
├── .env.example              # 环境变量示例（主目录）
├── docker-compose.yml        # 服务编排
└── README.md
```

## 敏感词过滤系统

聊天消息发送时，系统会经过**三级审核机制**确保内容合规：

### 审核流程

```
用户发送消息
    ↓
 限流检查（Redis 计数器，每分钟 20 条）
    ↓
 内容审核
    ├── 腾讯云 AI 审核（audit.aiEnabled = true 时启用）
    │   ├── pass  → 消息正常通过
    │   ├── review → 写入 AuditLog + Webhook 通知管理员
    │   └── reject → 写入 AuditLog + Webhook 通知 + 拦截消息
    │
    └── 本地敏感词过滤（AI 不可用时的兜底方案）
        ├── 命中敏感词 → 写入 AuditLog + Webhook 通知 + 拦截消息
        └── 未命中     → 消息正常通过
```

### 敏感词库

项目集成了 [konsheng/Sensitive-lexicon](https://github.com/konsheng/Sensitive-lexicon) 开源词库，包含 **51,361 个唯一敏感词**，覆盖以下分类：

| 分类 | 文件 | 词条数 |
|------|------|--------|
| 色情 | `色情词库.txt` `色情类型.txt` | ~1.2K |
| 政治 | `政治类型.txt` | ~326 |
| 广告/引流 | `广告类型.txt` | ~123 |
| 暴恐 | `暴恐词库.txt` | ~177 |
| 反动 | `反动词库.txt` | ~556 |
| 贪腐 | `贪腐词库.txt` | ~243 |
| 民生 | `民生词库.txt` | ~570 |
| 涉枪涉爆 | `涉枪涉爆.txt` | ~437 |
| 非法网址 | `非法网址.txt` | ~14.6K |
| GFW 补充 | `GFW补充词库.txt` | ~6.4K |
| 网易词库 | `网易前端过滤敏感词库.txt` | ~7.7K |
| 零时 (Tencent) | `零时-Tencent.txt` | ~53K |
| 其他 | 其余 5 个分类文件 | ~1.5K |

### 词库加载优先级

```
远程 URL (SystemConfig → chat.sensitiveWordsUrl)  ← 最高优先级
    ↓ 失败
本地目录 (config/sensitive-words/*.txt)            ← 打包在项目中
    ↓ 目录为空
本地 JSON (config/sensitive-words.json)            ← JSON 格式兜底
    ↓ 不存在
硬编码兜底 (ChatService.FALLBACK_KEYWORDS)         ← 代码内最小词库
```

- **远程拉取**：在系统配置中设置 `chat.sensitiveWordsUrl` 指向远程词库文件 URL，服务启动时自动拉取并合并
- **定时刷新**：每 24 小时自动重新拉取远程词库，确保时效性
- **格式兼容**：远程词库同时支持 JSON 数组 `["词1","词2"]` 和纯文本每行一词两种格式
- **本地方案**：`config/sensitive-words/` 目录下的 17 个 .txt 文件随 git 发布，去重后得到 51K+ 词

### 审核通知

命中敏感词或 AI 审核 reject/review 时，系统通过 Webhook 推送到：

- **企业微信**（Markdown 格式）
- **飞书**（Text 格式）
- **钉钉**（Markdown 格式）

通知内容包含：类型、用户 ID、违规内容（前 200 字）、时间戳。

相关配置项：
- `notification.enabled` — 通知总开关
- `notification.types` — 各类型通知开关（JSON）
- `notification.channels` — Webhook URL 配置（JSON: `{"wechatWork":"...","feishu":"...","dingtalk":"..."}`）
- `audit.aiEnabled` — 腾讯云 AI 审核开关
- `chat.sensitiveWordsUrl` — 远程词库拉取地址（可选）

## 快速开始

### 环境要求

- Node.js 18+
- Docker 20.10+
- Docker Compose 2.0+
- MySQL 8.0
- Redis 7.x

### 本地开发

#### 1. 克隆项目

```bash
git clone https://github.com/Abuab/qiyuanshe.git
cd qiyuanshe
```

#### 2. 配置环境变量

```bash
# 复制主目录环境变量配置
cp .env.example .env

# 复制后端环境变量配置
cd backend
cp .env.example .env
cd ..
```

#### 3. 启动数据库服务

```bash
docker compose up -d mysql redis
```

#### 4. 启动后端服务

```bash
cd backend
npm install
npm run build
npm run start:dev
```

#### 5. 启动管理后台

```bash
cd admin
npm install
npm run dev
```

## 环境变量配置

### 主目录 `.env`（Docker Compose 使用）

此文件用于配置 Docker 容器所需的基础设施服务。

```env
#=========================================
# 数据库配置
#=========================================
MYSQL_ROOT_PASSWORD=your_mysql_root_password
MYSQL_DATABASE=qiyuanshe
MYSQL_USER=qiyuanshe_user
MYSQL_PASSWORD=your_mysql_password

#=========================================
# Redis 配置
#=========================================
REDIS_PASSWORD=your_redis_password

#=========================================
# JWT 配置
#=========================================
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
WECHAT_NOTIFY_URL=https://yourdomain.com/api/payment/notify

#=========================================
# 腾讯云配置（内容审核）
#=========================================
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key

#=========================================
# OSS + CDN 配置（可选）
#=========================================
# 上传策略：local = 服务器本地 / oss = 对象存储
UPLOAD_STRATEGY=local

# 静态资源 CDN 域名
CDN_DOMAIN=https://cdn.yourdomain.com
CDN_ENABLED=false
STATIC_BASE_URL=https://yourdomain.com

# 阿里云 OSS
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET=your-bucket-name
OSS_ACCESS_KEY_ID=your-key
OSS_ACCESS_KEY_SECRET=your-secret
OSS_UPLOAD_PREFIX=uploads/
```

### 后端 `backend/.env`（应用直接使用）

此文件用于 NestJS 应用直接连接数据库和 Redis。

```env
# 应用配置
NODE_ENV=development
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=qiyuanshe_user
DB_PASSWORD=your_mysql_password
DB_DATABASE=qiyuanshe

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# 静态资源 URL 前缀（CDN）
STATIC_BASE_URL=https://yourdomain.com

# 微信配置
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret
WECHAT_MCH_ID=your_merchant_id
WECHAT_APIKEY=your_apikey
WECHAT_NOTIFY_URL=http://localhost:3000/api/payment/notify
```

**注意**：
- 主目录 `.env` 用于 Docker Compose 启动容器时传入环境变量
- 后端 `backend/.env` 用于本地开发时应用直接读取
- 两者用途不同，不是冗余配置

## 生产部署（完整步骤）

**前置条件**：已购买域名并解析到服务器公网 IP，防火墙已开放 80 / 443 端口。

### 第一步：克隆项目

```bash
git clone https://github.com/Abuab/qiyuanshe.git /opt/lingtong
cd /opt/lingtong
```

### 第二步：配置主目录 `.env`

```bash
cp .env.example .env
vim .env
```

需要修改的配置项（其余保持默认或按需调整）：

```env
# 数据库 — 务必修改密码
MYSQL_ROOT_PASSWORD=your_strong_mysql_password
MYSQL_PASSWORD=your_strong_mysql_password

# Redis — 务必修改密码
REDIS_PASSWORD=your_strong_redis_password

# JWT — 务必修改为随机字符串（至少 32 位）
JWT_SECRET=your-random-32-char-jwt-secret
ADMIN_JWT_SECRET=your-random-admin-jwt-secret

# 微信小程序（必须填写真实值）
WECHAT_APPID=你的微信AppID
WECHAT_SECRET=你的微信AppSecret

# 腾讯云审核
TENCENT_SECRET_ID=你的腾讯云SecretId
TENCENT_SECRET_KEY=你的腾讯云SecretKey

# 域名
DOMAIN=yourdomain.com
API_BASE_URL=https://yourdomain.com
ADMIN_BASE_URL=https://yourdomain.com
```

### 第三步：配置后端 `backend/.env`

```bash
cp backend/.env.example backend/.env
vim backend/.env
```

需要修改：

```env
NODE_ENV=production
DB_PASSWORD=和主目录 .env 中 MYSQL_PASSWORD 保持一致
REDIS_PASSWORD=和主目录 .env 中 REDIS_PASSWORD 保持一致
JWT_SECRET=和主目录 .env 中 JWT_SECRET 保持一致
WECHAT_APPID=你的微信AppID
WECHAT_SECRET=你的微信AppSecret
WECHAT_NOTIFY_URL=https://yourdomain.com/api/payment/notify
```

> **注意**：Docker Compose 启动时会通过 `environment` 注入变量覆盖这些值，此文件是备用/手动启动时使用。

### 第四步：配置 Nginx（Docker 容器内）

```bash
cp docker/nginx/nginx.conf.example docker/nginx/nginx.conf
vim docker/nginx/nginx.conf
```

需要修改：

```nginx
# 替换两处 server_name
server_name yourdomain.com;   # 改为你的实际域名
```

> `docker/nginx/nginx.conf` 已被 `.gitignore` 忽略，git pull 不会覆盖你已配置的版本。

### 第五步：构建并启动所有服务

```bash
docker compose up -d --build
```

等待约 1-2 分钟所有服务启动完成。

```bash
# 查看服务状态（所有容器 state 应为 Up 且 healthy）
docker compose ps

# 查看日志（如有异常）
docker compose logs -f
```

### 第六步：申请 SSL 证书

```bash
# 运行证书申请脚本
./scripts/setup-ssl.sh apply
```

此脚本会自动：
1. 停止 nginx 容器（释放 80 端口）
2. 调用 certbot standalone 模式申请 Let's Encrypt 证书
3. 将证书复制到 `docker/nginx/ssl/`
4. 重启 nginx 容器，SSL 生效

### 第七步：配置证书自动续期

```bash
./scripts/setup-ssl.sh setup-renewal
```

此脚本会：
1. 创建续期钩子脚本（续期后自动复制证书并 reload nginx）
2. 添加 crontab 定时任务（每天凌晨 2:00 检查续期）

验证自动续期是否正常：

```bash
# 测试续期（不会真正续期，仅检查）
sudo certbot renew --dry-run
```

### 第八步：验证部署

```bash
# 验证 HTTPS
curl -I https://yourdomain.com

# 验证 API
curl https://yourdomain.com/api/health

# 浏览器打开管理后台
# https://yourdomain.com
```

### 第九步：配置开机自启

```bash
sudo tee /etc/systemd/system/lingtong.service > /dev/null << 'EOF'
[Unit]
Description=栖缘社婚恋交友平台
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

sudo systemctl daemon-reload
sudo systemctl enable lingtong.service
```

## 手动部署（不使用 Docker）

本方案适合不想使用 Docker 的场景，所有服务直接运行在宿主机上。

### 服务器要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| 操作系统 | Ubuntu 20.04 / CentOS 7 / Debian 11 | Ubuntu 22.04 LTS |
| CPU | 2 核 | 4 核+ |
| 内存 | 4 GB | 8 GB+ |
| 硬盘 | 50 GB | 100 GB+ SSD |
| 带宽 | 5 Mbps | 10 Mbps+ |

### 第一步：更新系统 & 安装基础工具

```bash
# Ubuntu / Debian
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim build-essential software-properties-common

# CentOS
sudo yum update -y
sudo yum install -y epel-release curl wget git vim gcc-c++ make
```

### 第二步：安装 Node.js 18（LTS）

```bash
# 使用 NodeSource 官方源
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证版本
node -v    # v18.x.x
npm -v     # 9.x.x

# 安装全局工具
sudo npm install -g pm2 typescript @nestjs/cli
```

> **CentOS**: 将 `apt` 替换为 `yum`，或使用 `nvm` 安装（见下文备选方案）。

**备选方案 — 使用 nvm：**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
npm install -g pm2 typescript @nestjs/cli
```

### 第三步：安装 MySQL 8.0

```bash
# Ubuntu 22.04
sudo apt install -y mysql-server

# 启动并设置开机自启
sudo systemctl enable mysql
sudo systemctl start mysql

# 安全初始化（设置 root 密码、删除匿名用户等）
sudo mysql_secure_installation
```

> **CentOS**：
> ```bash
> sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm
> sudo yum install -y mysql-community-server
> sudo systemctl enable mysqld && sudo systemctl start mysqld
> # 首次启动会生成临时密码
> sudo grep 'temporary password' /var/log/mysqld.log
> ```

**创建数据库和用户：**

```bash
sudo mysql -u root -p
```

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS lingtong_match
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 创建数据库用户（修改密码）
CREATE USER IF NOT EXISTS 'lingtong'@'localhost' IDENTIFIED BY 'your_mysql_password';
CREATE USER IF NOT EXISTS 'lingtong'@'127.0.0.1' IDENTIFIED BY 'your_mysql_password';

-- 授权
GRANT ALL PRIVILEGES ON lingtong_match.* TO 'lingtong'@'localhost';
GRANT ALL PRIVILEGES ON lingtong_match.* TO 'lingtong'@'127.0.0.1';

-- 刷新权限
FLUSH PRIVILEGES;

EXIT;
```

**导入表结构（TypeORM synchronize 会自动建表，也可手动执行 init.sql）：**

```bash
# 方式一：让 NestJS 自动建表（synchronize: true，推荐）
# 方式二：手动导入 SQL
sudo mysql -u root -p lingtong_match < docker/mysql/init.sql
```

### 第四步：安装 Redis 7.x

```bash
# Ubuntu
sudo apt install -y redis-server

# 配置 Redis 密码
sudo sed -i 's/^# requirepass .*/requirepass your_redis_password/' /etc/redis/redis.conf

# 启动并设置开机自启
sudo systemctl enable redis-server
sudo systemctl restart redis-server

# 验证
redis-cli -a your_redis_password ping   # 返回 PONG
```

> **CentOS**：
> ```bash
> sudo yum install -y redis
> sudo systemctl enable redis && sudo systemctl start redis
> ```

### 第五步：克隆项目 & 配置环境变量

```bash
# 克隆到 /opt 目录
cd /opt
sudo git clone https://github.com/Abuab/qiyuanshe.git lingtong
sudo chown -R $USER:$USER /opt/lingtong
cd /opt/lingtong
```

**配置主目录 `.env`（后端运行时参考）：**

```bash
cp .env.example .env
vim .env
```

```env
# 数据库
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=lingtong_match
MYSQL_USER=lingtong
MYSQL_PASSWORD=your_mysql_password

# Redis
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=生成一个至少32位的随机字符串
ADMIN_JWT_SECRET=生成另一个不同的随机字符串

# 微信
WECHAT_APPID=你的微信小程序AppID
WECHAT_SECRET=你的微信小程序AppSecret

# 域名
DOMAIN=yourdomain.com
API_BASE_URL=https://yourdomain.com
ADMIN_BASE_URL=https://yourdomain.com
STATIC_BASE_URL=https://yourdomain.com
```

**配置后端专用 `backend/.env`：**

```bash
cp backend/.env.example backend/.env
vim backend/.env
```

```env
NODE_ENV=production
PORT=3000

# 数据库（连接本地）
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=lingtong
DB_PASSWORD=your_mysql_password
DB_DATABASE=lingtong_match

# Redis（连接本地）
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# JWT
JWT_SECRET=和主目录 .env 相同的 JWT_SECRET
JWT_EXPIRES_IN=7d

# 微信
WECHAT_APPID=你的微信AppID
WECHAT_SECRET=你的微信AppSecret
WECHAT_NOTIFY_URL=https://yourdomain.com/api/payment/notify

# 静态资源
STATIC_BASE_URL=https://yourdomain.com

# 腾讯云审核
TENCENT_SECRET_ID=你的SecretId
TENCENT_SECRET_KEY=你的SecretKey

# CORS 允许的域名
CORS_ORIGINS=https://yourdomain.com,http://localhost:5173

# 上传文件目录（不配置则默认用 ./uploads）
UPLOAD_DIR=/opt/lingtong/data/uploads
```

**创建数据目录：**

```bash
mkdir -p /opt/lingtong/data/uploads /opt/lingtong/data/logs
chmod 755 /opt/lingtong/data/uploads
```

### 第六步：构建 & 启动后端服务

```bash
cd /opt/lingtong/backend

# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 验证编译产物
ls dist/main.js   # 应存在

# 用 PM2 启动后端（进程守护）
pm2 start dist/main.js \
  --name "lingtong-api" \
  --cwd /opt/lingtong/backend \
  --time \
  --log /opt/lingtong/data/logs/api.log \
  --env production

# 保存 PM2 进程列表（开机自启用）
pm2 save

# 配置 PM2 开机自启
pm2 startup
# 执行屏幕上输出的 sudo 命令
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# 验证后端是否运行
curl http://127.0.0.1:3000/api/health
# 应返回: {"code":200,"message":"success","data":{"status":"ok"}}
```

**后端 PM2 管理命令：**

```bash
pm2 status                    # 查看所有进程
pm2 logs lingtong-api         # 查看日志
pm2 restart lingtong-api      # 重启后端
pm2 stop lingtong-api         # 停止后端
pm2 reload lingtong-api       # 0 秒停机重载
```

### 第七步：构建管理后台前端

```bash
cd /opt/lingtong/admin

# 安装依赖
npm install

# 编译生产版本
npm run build

# 构建产物在 dist/ 目录
ls dist/index.html   # 应存在

# 将构建产物部署到 Nginx 静态目录
sudo mkdir -p /var/www/lingtong/admin
sudo cp -r dist/* /var/www/lingtong/admin/
sudo chown -R www-data:www-data /var/www/lingtong/admin
```

### 第八步：安装 & 配置 Nginx

```bash
# 安装 Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

**创建 Nginx 站点配置：**

```bash
sudo vim /etc/nginx/sites-available/lingtong
```

```nginx
# 上游后端服务
upstream lingtong_api {
    server 127.0.0.1:3000;
    keepalive 32;
}

# HTTP (80) — 重定向到 HTTPS + Let's Encrypt 验证
server {
    listen 80;
    server_name yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type text/plain;
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS (443)
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # certbot 续期验证
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type text/plain;
        allow all;
    }

    # API 代理
    location /api/ {
        proxy_pass http://lingtong_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # 禁止缓存 API 响应
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        expires -1;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 上传文件（静态资源 — 可长期缓存）
    location ^~ /uploads/ {
        root /opt/lingtong/data;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Access-Control-Allow-Origin "*" always;
    }

    # 管理后台静态资源（Vite 构建产物带 hash）
    location /assets/ {
        root /var/www/lingtong/admin;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Access-Control-Allow-Origin "*" always;
    }

    # 管理后台（SPA 入口）
    location / {
        root /var/www/lingtong/admin;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

**启用站点并重载 Nginx：**

```bash
# 创建 certbot 验证目录
sudo mkdir -p /var/www/certbot

# 启用站点
sudo ln -sf /etc/nginx/sites-available/lingtong /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 验证配置语法
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 第九步：申请 SSL 证书

```bash
# 安装 certbot
sudo apt install -y certbot

# 创建 SSL 证书目录
sudo mkdir -p /etc/nginx/ssl

# 首次申请证书（standalone 模式需先停 Nginx）
sudo systemctl stop nginx

sudo certbot certonly \
  --standalone \
  --preferred-challenges http \
  --agree-tos \
  --no-eff-email \
  --email your-email@example.com \
  -d yourdomain.com

# 复制证书到 Nginx 目录
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /etc/nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /etc/nginx/ssl/privkey.pem
sudo chmod 644 /etc/nginx/ssl/fullchain.pem
sudo chmod 600 /etc/nginx/ssl/privkey.pem

# 启动 Nginx
sudo systemctl start nginx
```

**配置证书自动续期：**

```bash
# 创建续期钩子脚本
sudo tee /etc/letsencrypt/renewal-hooks/deploy/lingtong-ssl.sh > /dev/null << 'HOOK'
#!/bin/bash
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /etc/nginx/ssl/fullchain.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /etc/nginx/ssl/privkey.pem
chmod 644 /etc/nginx/ssl/fullchain.pem
chmod 600 /etc/nginx/ssl/privkey.pem
systemctl reload nginx
echo "$(date '+%Y-%m-%d %H:%M:%S') SSL renewed" >> /var/log/lingtong-ssl-renewal.log
HOOK

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/lingtong-ssl.sh

# 测试续期
sudo certbot renew --dry-run

# 添加 crontab 定时任务（每天凌晨 2:00）
(sudo crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 2 * * * certbot renew --quiet") | sudo crontab -
```

### 第十步：编译小程序代码

```bash
cd /opt/lingtong

# 安装小程序依赖
npm install

# 编译微信小程序
npm run build:mp-weixin
```

构建产物在 `dist/build/mp-weixin`，用微信开发者工具导入即可。

### 第十一步：验证部署

```bash
# 1. 健康检查
curl https://yourdomain.com/api/health

# 2. SSL 证书是否生效
curl -I https://yourdomain.com

# 3. 管理后台可访问
curl -I https://yourdomain.com/index.html

# 4. Nginx 日志
sudo tail -f /var/log/nginx/access.log
```

### 第十二步：配置系统服务开机自启

**PM2 进程守护：**

```bash
# 之前 pm2 startup 已配置，确认一下
pm2 status

# 确保 PM2 开机自启
systemctl is-enabled pm2-$USER
```

**Nginx 开机自启：**

```bash
sudo systemctl enable nginx
```

**MySQL 开机自启：**

```bash
sudo systemctl enable mysql    # Ubuntu
# 或 sudo systemctl enable mysqld   # CentOS
```

**Redis 开机自启：**

```bash
sudo systemctl enable redis-server   # Ubuntu
# 或 sudo systemctl enable redis     # CentOS
```

### 日常运维命令速查

```bash
# ====== 后端 ======
pm2 status                              # 查看后端进程状态
pm2 restart lingtong-api                # 重启后端
pm2 logs lingtong-api --lines 100       # 查看最近 100 行日志

# ====== Nginx ======
sudo nginx -t                           # 检查配置语法
sudo systemctl reload nginx             # 热重载配置
sudo systemctl restart nginx            # 重启
sudo tail -f /var/log/nginx/access.log  # 查看访问日志
sudo tail -f /var/log/nginx/error.log   # 查看错误日志

# ====== 更新部署 ======
cd /opt/lingtong
git pull

# 更新后端
cd backend && npm install && npm run build
pm2 restart lingtong-api

# 更新管理后台
cd ../admin && npm install && npm run build
sudo cp -r dist/* /var/www/lingtong/admin/
sudo systemctl reload nginx

# 重新编译小程序
cd /opt/lingtong && npm run build:mp-weixin
```

### 文件目录结构（手动部署）

```
/opt/lingtong/                          # 项目根目录
├── backend/                            # NestJS 后端源码
├── admin/                              # Vue3 管理后台源码
├── data/uploads/                       # 用户上传图片
├── data/logs/                          # 应用日志
├── dist/build/mp-weixin/               # 小程序构建产物

/var/www/lingtong/admin/                # 管理后台静态文件（Nginx 服务）
    ├── index.html
    ├── assets/
    └── ...

/etc/nginx/
├── sites-available/lingtong            # 站点配置
├── sites-enabled/lingtong -> ...       # 启用的站点（软链接）
└── ssl/
    ├── fullchain.pem                   # SSL 证书
    └── privkey.pem                     # SSL 私钥
```

## 服务访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 管理后台 | https://yourdomain.com | 管理员操作界面 |
| 后端 API | https://yourdomain.com/api | 小程序调用 |
| 上传文件 | https://yourdomain.com/uploads/ | 用户上传图片 |
| 健康检查 | https://yourdomain.com/api/health | 服务状态检查 |

### 默认管理员账号
- 用户名: `admin`
- 密码: `123456`

**重要提示**: 生产环境请立即修改默认密码！

## API 文档

### 认证接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/wechat-login` | POST | 微信登录 |
| `/api/auth/phone-login` | POST | 手机号登录 |
| `/api/auth/refresh` | POST | 刷新 Token |
| `/api/auth/profile` | GET | 获取个人资料 |

### 用户接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/users/recommend` | GET | 推荐用户列表 |
| `/api/users/filter` | POST | 筛选用户 |
| `/api/users/:id` | GET | 用户详情 |

### 管理后台接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/users` | GET | 用户列表 |
| `/api/admin/users/:id` | GET | 用户详情 |
| `/api/admin/users/:id/vip` | PUT | 更新VIP |
| `/api/admin/audit/list` | GET | 审核列表 |
| `/api/admin/matchmakers` | GET | 红娘列表 |
| `/api/admin/questions` | GET | 问题列表 |
| `/api/admin/payment/orders` | GET | 订单列表 |
| `/api/admin/payment/stats` | GET | 营收统计 |
| `/api/admin/captcha` | GET | 获取验证码 |
| `/api/admin/login` | POST | 管理员登录 |

### 系统配置接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/system/configs` | GET | 获取所有配置 |
| `/api/system/config/:key` | GET | 获取单个配置 |

### 健康检查

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 服务健康状态 |

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `users` | 用户表 |
| `user_photos` | 用户照片表 |
| `user_auths` | 用户认证表 |
| `hot_questions` | 热门问题表 |
| `question_answers` | 问题回答表 |
| `answer_likes` | 回答点赞表 |
| `matchmakers` | 红娘表 |
| `system_configs` | 系统配置表 |
| `vip_orders` | VIP订单表 |
| `chat_messages` | 聊天消息表 |
| `audit_logs` | 审核日志表 |
| `follows` | 用户关注表 |

## 运维脚本

### `scripts/install.sh` — 一键环境安装

**用途**：在空白服务器上安装 Docker、Docker Compose，创建项目目录，自动生成 `.env` 配置文件。

**用法**：

```bash
sudo bash scripts/install.sh
```

**执行内容**：
1. 自动检测操作系统（Ubuntu 20.04+ / CentOS 7+）
2. 安装 Docker + Docker Compose
3. 创建 backups / logs / certs / docker/nginx/ssl 等目录
4. 从 `.env.example` 生成 `.env`，并自动填入随机密码

> 注：`.env` 中的微信/腾讯云配置项仍需手动填写。

---

### `scripts/deploy.sh` — 一键部署

**用途**：Docker Compose 方式拉代码、备份数据库、构建并启动所有服务，执行健康检查。

**用法**：

```bash
bash scripts/deploy.sh
```

**执行内容**：
1. 检查 Docker 环境
2. 加载 `.env` 环境变量
3. 询问是否拉取最新代码（git pull）
4. 自动备份当前数据库
5. `docker compose up -d --build` 构建并启动
6. 等待服务就绪后依次检查 MySQL → Redis → API 健康状态
7. 输出所有容器运行状态

---

### `scripts/setup-ssl.sh` — SSL 证书管理

**用途**：Let's Encrypt 免费证书的申请与自动续期。

**用法**：

```bash
# 首次申请证书
bash scripts/setup-ssl.sh apply

# 配置自动续期（crontab + 钩子）
bash scripts/setup-ssl.sh setup-renewal

# 手动触发一次续期检查
bash scripts/setup-ssl.sh renew

# 仅安装 certbot 工具
bash scripts/setup-ssl.sh install
```

**子命令说明**：

| 子命令 | 说明 |
|--------|------|
| `apply` | 停止 nginx 容器 → standalone 模式申请证书 → 复制到 `docker/nginx/ssl/` → 重启 nginx |
| `setup-renewal` | 创建续期钩子脚本（续期后自动复制证书 + reload nginx）+ 添加 crontab 定时任务 |
| `renew` | 手动执行续期（webroot 模式，无需停机） |
| `install` | 仅安装 certbot（自动识别 dnf/yum/apt） |

**证书位置**：
- Let's Encrypt 归档：`/etc/letsencrypt/live/yourdomain.com/`
- 项目挂载目录：`docker/nginx/ssl/fullchain.pem` + `privkey.pem`

---

### `scripts/backup.sh` — 数据库备份

**用途**：自动备份 MySQL 数据库，压缩存储，支持远程上传到 OSS。

**用法**：

```bash
# 手动执行备份
bash scripts/backup.sh

# 配置定时任务（每天凌晨 2 点）
(crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/lingtong && bash scripts/backup.sh >> /var/log/lingtong-backup.log 2>&1") | crontab -
```

**执行内容**：
1. 检查 MySQL 容器是否运行
2. 执行 `mysqldump` 导出全量数据（含存储过程/触发器/事件）
3. gzip 压缩备份文件
4. 自动清理超过 `BACKUP_RETENTION_DAYS` 天的旧备份
5. 如配置了 OSS，可上传到阿里云 OSS（`ENABLE_REMOTE_BACKUP=true`）

**备份文件位置**：`backups/lingtong_YYMMDD_HHMMSS.sql.gz`

**依赖环境变量**：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MYSQL_ROOT_PASSWORD` | 数据库 root 密码 | - |
| `BACKUP_RETENTION_DAYS` | 备份保留天数 | 30 |
| `BACKUP_PATH` | 备份存储路径 | ./backups |
| `ENABLE_REMOTE_BACKUP` | 是否上传到 OSS | false |

---

### `scripts/cleanup.sh` — 日志清理

**用途**：清理应用日志、Nginx 日志、Docker 容器日志，释放磁盘空间。

**用法**：

```bash
# 手动执行清理
bash scripts/cleanup.sh

# 配置定时任务（每天凌晨 3 点）
(crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/lingtong && bash scripts/cleanup.sh >> /var/log/lingtong-cleanup.log 2>&1") | crontab -
```

**执行内容**：
1. 删除超过 7 天的应用日志（`logs/*.log`）
2. 清空所有 Docker 容器的内部日志（`docker inspect --LogPath`）
3. 删除空的日志目录

**日志保留策略**：
- 应用日志：保留 7 天
- Docker 容器日志：每次执行清空（容器内日志）
- Nginx 日志：跟随系统 `/var/log/nginx/`，由 logrotate 管理

---

### `scripts/monitor.sh` — 系统监控告警

**用途**：监控服务器磁盘、内存使用率，以及 API 响应时间，自动发送告警。

**用法**：

```bash
# 手动执行检查
bash scripts/monitor.sh

# 配置定时任务（每 5 分钟）
(crontab -l 2>/dev/null; echo "*/5 * * * * cd /opt/lingtong && bash scripts/monitor.sh >> /var/log/lingtong-monitor.log 2>&1") | crontab -
```

**监控指标**：

| 指标 | 阈值 | 环境变量 |
|------|------|----------|
| 磁盘使用率 | 80% | `DISK_USAGE_THRESHOLD` |
| 内存使用率 | 85% | `MEMORY_USAGE_THRESHOLD` |
| API 响应时间 | 3000ms | `API_RESPONSE_TIME_THRESHOLD` |

**告警渠道**（`.env` 中配置）：
- 企业微信机器人：`WECHAT_WEBHOOK_URL`
- 钉钉机器人：`DINGTALK_WEBHOOK_URL`

## 定时任务配置

```cron
# 数据库每日备份（凌晨2点）
0 2 * * * cd /opt/lingtong && ./scripts/backup.sh >> /var/log/backup.log 2>&1

# 日志清理（凌晨3点）
0 3 * * * cd /opt/lingtong && ./scripts/cleanup.sh >> /var/log/cleanup.log 2>&1

# 监控检查（每5分钟）
*/5 * * * * cd /opt/lingtong && ./scripts/monitor.sh >> /var/log/monitor.log 2>&1

# SSL 证书续期（每天凌晨2:00，由 setup-ssl.sh setup-renewal 自动配置）
0 2 * * * certbot renew --quiet --webroot -w /opt/lingtong/docker/nginx/certbot/www
```

## OSS 对象存储 & CDN 加速接入

### 架构图

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  小程序客户端 │────▶│  CDN 边缘节点  │────▶│  源站 Nginx:443  │
│  浏览器浏览器 │     │ cdn.yourdomain.com │     │ yourdomain.com  │
└─────────────┘     └──────┬───────┘     └────────┬────────┘
                           │                       │
                           │ 回源方式：              │ /api/*  → NestJS API
                           │ 1. origin → 服务器      │ /uploads/* → 静态文件
                           │ 2. oss    → OSS Bucket │ /* → Vue 管理后台
                           │              │
                           └──────────────┘
```

### 配置层级

接入 OSS/CDN 只需要修改环境变量，无需改代码：

| 变量 | 作用 | 影响范围 |
|------|------|----------|
| `UPLOAD_STRATEGY` | `local` 存服务器本地 / `oss` 上传到对象存储 | 上传接口行为 |
| `STATIC_BASE_URL` | 返回给客户端的图片 URL 前缀 | 上传接口返回值 |
| `CDN_ENABLED` | `true` 时优先使用 `CDN_DOMAIN` 作为返回前缀 | 上传接口返回值 |
| `CDN_DOMAIN` | CDN 加速域名 | 图片访问 URL |
| `CDN_ORIGIN_TYPE` | `origin` 回源到服务器 / `oss` 回源到 OSS | CDN 回源配置 |
| `OSS_*` | 阿里云 OSS 连接参数 | OSS 上传 / 回源 |

### 方案 A：CDN 回源到服务器（最小改动，推荐入门）

不引入 OSS，CDN 直接回源到你的服务器 Nginx。

**CDN 服务商控制台配置：**

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 加速域名 | `cdn.yourdomain.com` | 需先配置 CNAME 解析 |
| 源站类型 | 源站域名 | |
| 源站地址 | `yourdomain.com` | 你的服务器域名 |
| 回源端口 | 443 | |
| 回源协议 | HTTPS | 跟随 CDN |
| 回源 HOST | `yourdomain.com` | 源站域名 |
| 缓存规则 — `/uploads/` | 缓存 7 天 | 图片文件（文件名唯一） |
| 缓存规则 — `/assets/` | 缓存 365 天 | JS/CSS 路径含 hash |
| 缓存规则 — `/api/` | 不缓存（0 秒） | API 动态数据 |
| 缓存规则 — 其他 | 遵循源站 | |

**`.env` 配置：**

```env
# 保持上传到本地磁盘
UPLOAD_STRATEGY=local

# 上传后返回 CDN 地址给客户端
CDN_ENABLED=true
CDN_DOMAIN=https://cdn.yourdomain.com
STATIC_BASE_URL=https://cdn.yourdomain.com

# CDN 从服务器源站拉取
CDN_ORIGIN_TYPE=origin
CDN_ORIGIN_HOST=yourdomain.com
```

**重新部署：**

```bash
vim .env          # 修改上述配置
docker compose up -d api  # 重启 API 使环境变量生效
```

### 方案 B：OSS 存储 + CDN 回源到 OSS（推荐生产使用）

图片上传直接存到阿里云 OSS，CDN 从 OSS Bucket 拉取，减轻服务器带宽压力。

**前置步骤 — 阿里云控制台操作：**

1. 开通 [阿里云 OSS](https://oss.console.aliyun.com/)，创建 Bucket（公共读）
2. 开通 [阿里云 CDN](https://cdn.console.aliyun.com/)，添加加速域名 `cdn.yourdomain.com`
3. CDN 源站选择「OSS 域名」，指向刚创建的 Bucket
4. OSS 绑定自定义域名（可选），配置 CDN CNAME 解析

**`.env` 配置：**

```env
# 上传策略改为 OSS
UPLOAD_STRATEGY=oss

# 阿里云 OSS
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET=your-bucket-name
OSS_ACCESS_KEY_ID=your-ak-id
OSS_ACCESS_KEY_SECRET=your-ak-secret
OSS_UPLOAD_PREFIX=uploads/

# CDN 返回地址
CDN_ENABLED=true
CDN_DOMAIN=https://cdn.yourdomain.com
STATIC_BASE_URL=https://cdn.yourdomain.com

# CDN 从 OSS 回源
CDN_ORIGIN_TYPE=oss
```

> **注意**：方案 B 需要在后端代码中新增 OSS SDK 上传逻辑（`@aws-sdk/client-s3` 或 `ali-oss`）。目前项目中 `UPLOAD_STRATEGY=oss` 已预留，SDK 集成可根据需要后续实现。

### 无需 CDN（直连模式）

```env
UPLOAD_STRATEGY=local
CDN_ENABLED=false
STATIC_BASE_URL=https://yourdomain.com
```

上传后返回的图片 URL 为 `https://yourdomain.com/uploads/xxx.jpg`。

### URL 返回逻辑（代码级）

后端上传接口按以下优先级生成返回给客户端的 URL：

```
CDN_ENABLED=true && CDN_DOMAIN 有效
  → https://cdn.yourdomain.com/uploads/xxx.jpg

STATIC_BASE_URL 已配置
  → https://yourdomain.com/uploads/xxx.jpg

API_BASE_URL 兜底
  → https://yourdomain.com/uploads/xxx.jpg
```

### 源站 Nginx 缓存头（已内置）

Nginx 已针对 CDN 回源场景配置了完整的缓存策略：

| 路径 | Cache-Control | 过期时间 | 说明 |
|------|---------------|----------|------|
| `/uploads/*` | `public, max-age=31536000, immutable` | 365 天 | 图片文件（文件名含时间戳，永不重复） |
| `/assets/*` | `public, max-age=31536000, immutable` | 365 天 | Vite 构建产物（路径含 hash） |
| `/api/*` | `no-cache, no-store, must-revalidate` | 不缓存 | API 动态响应 |

### 验证 CDN 是否生效

```bash
# 1. 直接访问源站
curl -I https://yourdomain.com/uploads/test.jpg

# 2. 通过 CDN 访问（观察 X-Cache 头）
curl -I https://cdn.yourdomain.com/uploads/test.jpg

# 预期看到：
# X-Cache: MISS (首次) 或 HIT (后续)
# Cache-Control: public, max-age=31536000, immutable
```

## 常见问题排查

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
lsof -i :80
lsof -i :443
```

### 4. 重新初始化数据库

```bash
# 停止服务
docker compose down

# 删除数据卷（注意：会删除所有数据）
docker compose down -v

# 重新启动
docker compose up -d

# 重新初始化数据
sleep 30
docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" qiyuanshe < docker/mysql/init.sql
```

## 开发指南

### 添加新的 API 模块

1. 在 `backend/src/` 下创建模块目录
2. 使用 NestJS CLI 生成模块：

```bash
cd backend
nest g resource module-name
```

3. 在 `app.module.ts` 中注册新模块

### 添加新的管理页面

1. 在 `admin/src/views/` 下创建页面目录
2. 在 `admin/src/api/` 下添加 API 接口
3. 在 `admin/src/router/` 下添加路由

## 安全建议

- 生产环境请务必修改所有默认密码
- JWT Secret 请使用复杂的随机字符串（建议 32 位以上）
- 定期更新依赖包版本
- 配置防火墙，只开放必要端口（80、443、22）
- 开启 Redis 密码认证
- 启用 MySQL SSL 连接
- 定期备份数据库

### 防火墙配置示例

```bash
# 只开放必要端口
ufw allow 22    # SSH
ufw allow 80     # HTTP
ufw allow 443    # HTTPS
ufw enable
```

### 限制 Docker 日志大小

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

## 常用命令汇总

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

## 相关文档

- [NestJS 文档](https://docs.nestjs.com/)
- [Vue3 文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [Docker 官方文档](https://docs.docker.com/)
- [Let's Encrypt 证书申请](https://certbot.eff.org/)

## 应急操作指南

### 1. 忘记密码

如果管理员忘记密码，无法登录后台，可通过以下步骤重置：

**步骤 1：进入后端容器生成 bcrypt 密码**

```bash
docker exec -it lingtong_api sh
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('你的新密码', 10).then(h => console.log(h));"
```

复制输出的 hash 值（格式如 `$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）。

**步骤 2：进入 MySQL 更新密码**

```bash
docker exec -it lingtong_mysql mysql -u root -p -e "USE qiyuanshe; UPDATE admin_user SET password='上面复制的hash值' WHERE username='admin';"
```

> **注意**：将 `-p` 后的密码替换为你的 MySQL root 密码。

**步骤 3：使用新密码登录**

刷新登录页，使用新密码登录即可。

---

### 2. 忘记 MFA / 验证器丢失

如果管理员绑定了 MFA 但丢失验证器或验证码一直错误，可通过以下步骤禁用 MFA：

**步骤 1：数据库直接禁用 MFA**

```bash
docker exec -it lingtong_mysql mysql -u root -p your_password -e "USE qiyuanshe; UPDATE admin_user SET is_mfa_enabled = false, mfa_type = 'none', mfa_secret = NULL WHERE id = 1;"
```

> **注意**：
> - 将 `your_password` 替换为你的 MySQL root 密码
> - 将 `id = 1` 替换为实际的管理员 ID（如果不确定，先执行 `SELECT id, username FROM admin_user;` 查看）

**步骤 2：重新登录**

禁用 MFA 后，刷新登录页，直接输入用户名密码即可登录，不再要求 MFA 验证码。

**步骤 3：重新绑定 MFA（可选）**

登录后进入「个人中心 → 安全设置」，重新生成二维码并绑定新的验证器。

---

### 3. 常见问题

**Q: 执行 SQL 后仍然要求 MFA？**

请确认：
- SQL 执行成功（没有报错）
- 刷新的是登录页（不是浏览器缓存的旧页面）
- 如果使用了 CDN 或 Nginx 缓存，尝试 `Ctrl+F5` 或 `Cmd+Shift+R` 强制刷新

**Q: 如何查看管理员 ID？**

```bash
docker exec -it lingtong_mysql mysql -u root -p -e "USE qiyuanshe; SELECT id, username, is_mfa_enabled FROM admin_user;"
```

---

## License

MIT License

---

*文档版本: v2.1*
*最后更新: 2026-06-02*
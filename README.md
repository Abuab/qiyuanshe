# 栖缘社 - 婚恋交友平台

基于 Vue3 + NestJS + TypeScript 的现代化婚恋交友小程序后端管理系统。

## 项目简介

栖缘社是一款面向婚恋场景的小程序平台，提供用户管理、红娘服务、问答社区、会员订阅、支付功能等完整的婚恋解决方案。

## 功能模块

### C端小程序功能
- **用户系统**: 微信授权登录、个人资料管理、照片上传认证
- **问答社区**: 热门问题发布、回答互动、点赞评论
- **红娘服务**: 专业红娘推荐、一对一匹配服务
- **会员体系**: 黄金/钻石/至尊VIP多种会员等级
- **分享海报**: 个性化分享海报生成与追踪

### 管理后台功能
- **用户管理**: 用户列表、资料审核、状态管理、VIP管理
- **内容审核**: AI智能审核 + 人工复核（照片/回答/用户资料）
- **红娘管理**: 红娘资料编辑、排序、状态管理
- **问答管理**: 问题发布、回答管理、热门问题配置
- **订单管理**: 会员订单查询、退款处理、营收统计
- **系统配置**: 小程序配置、分享配置、支付配置、审核配置

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
│   ├── nginx.conf
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
├── docker/                   # Docker 配置文件
│   ├── mysql/
│   │   ├── init.sql          # 数据库初始化
│   │   └── my.cnf            # MySQL 配置
│   └── nginx/
│       └── nginx.conf        # Nginx 配置
│
├── scripts/                  # 运维脚本
│   ├── deploy.sh             # 一键部署
│   ├── backup.sh             # 数据库备份
│   ├── cleanup.sh            # 日志清理
│   ├── monitor.sh            # 监控告警
│   └── install.sh            # 环境安装
│
├── .env.example              # 环境变量示例（主目录）
├── docker-compose.yml        # 服务编排
└── README.md
```

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
WECHAT_NOTIFY_URL=https://api.lingtong.com/payment/notify

#=========================================
# 腾讯云配置（内容审核）
#=========================================
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
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

## 生产部署

### 部署方式一：使用 Docker Compose（一键部署）

```bash
# 一键启动所有服务
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 部署方式二：手动部署

#### 1. 服务器要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 硬盘 | 50GB | 100GB+ SSD |
| 带宽 | 5Mbps | 10Mbps+ |

#### 2. 安装 Docker

```bash
# 自动安装脚本
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

#### 3. 申请 SSL 证书

```bash
# 停止 nginx（如果正在运行）
systemctl stop nginx

# 申请 Let's Encrypt 免费证书
certbot certonly --standalone -d api.lingtong.com -d admin.lingtong.com \
  --email your-email@example.com --agree-tos --no-eff-email --manual --preferred-challenges dns

# 复制证书到项目目录
mkdir -p docker/nginx/ssl
cp /etc/letsencrypt/live/api.lingtong.com/fullchain.pem docker/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/api.lingtong.com/privkey.pem docker/nginx/ssl/key.pem
```

#### 4. 配置环境变量

```bash
cp .env.example .env
vim .env  # 修改各项配置
```

#### 5. 初始化数据库

```bash
# 等待 MySQL 启动完成
sleep 30

# 执行初始化 SQL
docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" qiyuanshe < docker/mysql/init.sql
```

#### 6. 配置开机自启

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

systemctl daemon-reload
systemctl enable lingtong.service
```

## 服务访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 管理后台 | http://localhost:8080 | 管理员操作界面（本地开发） |
| 后端 API | http://localhost:3000/api | 小程序/前端调用 |
| 健康检查 | http://localhost:3000/api/health | 服务状态检查 |

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

| 脚本 | 说明 |
|------|------|
| `scripts/install.sh` | 一键安装（Ubuntu） |
| `scripts/deploy.sh` | 一键部署 |
| `scripts/backup.sh` | 数据库备份 |
| `scripts/cleanup.sh` | 日志清理 |
| `scripts/monitor.sh` | 监控告警 |

## 定时任务配置

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

## License

MIT License

---

*文档版本: v2.0*
*最后更新: 2026-05-31*
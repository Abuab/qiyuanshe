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
lingtong-match/
├── admin/                    # 管理后台前端
│   ├── src/
│   │   ├── api/             # API 接口定义
│   │   ├── components/      # 公共组件
│   │   ├── router/          # 路由配置
│   │   ├── store/           # 状态管理
│   │   ├── styles/          # 全局样式
│   │   └── views/           # 页面组件
│   │       ├── audit/       # 审核管理
│   │       ├── matchmaker/  # 红娘管理
│   │       ├── payment/     # 订单管理
│   │       ├── question/    # 问答管理
│   │       ├── system/      # 系统配置
│   │       └── user/        # 用户管理
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── backend/                  # 后端服务
│   ├── src/
│   │   ├── admin/           # 管理后台 API
│   │   ├── audit/           # 内容审核模块
│   │   ├── auth/            # 认证授权
│   │   ├── chat/            # 即时通讯
│   │   ├── common/          # 公共模块
│   │   ├── config/          # 配置文件
│   │   ├── entities/        # 数据库实体
│   │   ├── payment/         # 支付模块
│   │   ├── poster/          # 海报生成
│   │   ├── question/        # 问答模块
│   │   ├── system/          # 系统配置
│   │   ├── user/            # 用户模块
│   │   └── app.module.ts
│   ├── Dockerfile
│   └── package.json
│
├── docker/                   # Docker 配置文件
│   ├── mysql/
│   │   ├── init.sql         # 数据库初始化
│   │   └── my.cnf           # MySQL 配置
│   └── nginx/
│       └── nginx.conf       # Nginx 配置
│
├── scripts/                  # 运维脚本
│   ├── deploy.sh            # 一键部署
│   ├── backup.sh            # 数据库备份
│   ├── cleanup.sh           # 日志清理
│   ├── monitor.sh           # 监控告警
│   └── install.sh           # 环境安装
│
├── .env.example             # 环境变量示例
├── docker-compose.yml       # 服务编排
├── DEPLOY.md               # 部署文档
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
git clone https://github.com/your-repo/lingtong-match.git
cd lingtong-match
```

#### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，修改数据库、Redis 等配置
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

### 生产部署

详细部署步骤请参考 [部署文档](DEPLOY.md)。

```bash
# 一键部署
chmod +x scripts/install.sh
sudo bash scripts/install.sh

# 或手动部署
docker compose up -d --build
```

## API 文档

### 认证接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/auth/wechat` | POST | 微信登录 |
| `/auth/phone` | POST | 手机号登录 |
| `/auth/refresh` | POST | 刷新 Token |

### 用户接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/users/profile` | GET | 获取个人资料 |
| `/users/profile` | PUT | 更新个人资料 |
| `/users/photos` | POST | 上传照片 |

### 管理后台接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/admin/users` | GET | 用户列表 |
| `/admin/users/:id` | GET | 用户详情 |
| `/admin/users/:id/vip` | PUT | 更新VIP |
| `/admin/audit/list` | GET | 审核列表 |
| `/admin/audit/:id/approve` | POST | 审核通过 |
| `/admin/audit/:id/reject` | POST | 审核拒绝 |
| `/admin/payment/orders` | GET | 订单列表 |
| `/admin/payment/stats` | GET | 营收统计 |

### 系统配置接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/system/configs` | GET | 获取所有配置 |
| `/system/config/:key` | GET | 获取单个配置 |
| `/system/configs` | PUT | 更新配置（需管理员） |

### 健康检查

| 接口 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 服务健康状态 |

## 环境变量

### 后端环境变量 (backend/.env)

```env
# 数据库
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=lingtong_match
MYSQL_USER=lingtong
MYSQL_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# 微信小程序
WECHAT_APPID=your_appid
WECHAT_SECRET=your_secret

# 微信支付
WECHAT_MCH_ID=your_mch_id
WECHAT_API_V3_KEY=your_api_v3_key

# 腾讯云（内容审核）
TENCENTCLOUD_SECRET_ID=your_secret_id
TENCENTCLOUD_SECRET_KEY=your_secret_key
```

详细配置请参考 `.env.example` 文件。

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `users` | 用户表 |
| `user_photos` | 用户照片表 |
| `user_auths` | 用户认证表 |
| `hot_questions` | 热门问题表 |
| `question_answers` | 问题回答表 |
| `matchmakers` | 红娘表 |
| `system_configs` | 系统配置表 |
| `vip_orders` | VIP订单表 |
| `chat_messages` | 聊天消息表 |
| `audit_logs` | 审核日志表 |

## 运维脚本

| 脚本 | 说明 |
|------|------|
| `scripts/install.sh` | 一键安装（Ubuntu） |
| `scripts/deploy.sh` | 一键部署 |
| `scripts/backup.sh` | 数据库备份 |
| `scripts/cleanup.sh` | 日志清理 |
| `scripts/monitor.sh` | 监控告警 |

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

### 数据库迁移

```bash
cd backend
npm run typeorm migration:generate -- --name=AddNewTable
npm run typeorm migration:run
```

## 安全建议

- 生产环境请务必修改所有默认密码
- JWT Secret 请使用复杂的随机字符串
- 定期更新依赖包版本
- 配置防火墙，只开放必要端口
- 开启 Redis 密码认证
- 启用 MySQL SSL 连接

## 相关文档

- [部署文档](DEPLOY.md) - 详细的服务器部署指南
- [NestJS 文档](https://docs.nestjs.com/)
- [Vue3 文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)

## License

MIT License

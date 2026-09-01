# 栖缘社 License 授权系统 — 部署与运维说明

> 本文档覆盖「License Key + 激活次数限制 + 在线校验」授权方案从签发到部署、激活、运维的完整流程。

---

## 一、方案概述

授权方案已从早期的「机器指纹强绑定」演进为「**License Key + 激活次数限制 + 在线校验**」，核心机制：

- **RSA-SHA256 非对称签名**：授权方用私钥签发 License Key，客户部署的后端用硬编码公钥验签；许可证服务器也用同一公钥验签。
- **激活次数限制**：一个 License Key 最多可在 N 台服务器上激活（`maxActivations`，默认 1）。许可证服务器为每个激活分配唯一 `activationId`，用于心跳、解绑与去重。
- **在线校验**：客户后端激活时在线注册，之后每天凌晨 3 点向许可证服务器心跳，支持远程吊销。
- **离线激活兜底**：激活时若许可证服务器不可达（网络错误），降级为离线激活（本地验签通过即生效，`activationId` 为空），后续心跳在线时自动对账补齐。
- **fail-closed**：无激活记录 / 验签失败时，后端按 `unauthorized` 处理，只保留只读白名单（浏览、实名认证），写功能被拦截。

### 授权四态

| 状态 | 写操作 | 读操作 | 触发条件 |
|------|--------|--------|----------|
| `valid` | ✅ | ✅ | 激活且未过期、未被吊销 |
| `grace_period` | ✅ | ✅ | 远程吊销后的 7 天宽限期 |
| `expired` | ❌ | ✅ | 本地验签已过过期时间 |
| `unauthorized` | ❌ | ✅ | 未激活 / 验签失败 / 服务器异常 |

---

## 二、组件与文件清单

| 组件 | 路径 | 说明 |
|------|------|------|
| 签发脚本 | `generate-license.js` | 本地工具，用私钥签发 License Key，**私钥绝不提交** |
| 后端授权模块 | `backend/src/license/` | RSA 验签、激活/解绑/心跳、授权状态 Guard |
| 后端实体 | `backend/src/entities/SystemLicense.ts` | `system_licenses` 表（含 `activationId`） |
| 后端迁移 | `backend/migrations/1757000000000*`、`1757000000001*` | 建表与清理旧字段 |
| 管理后台接口 | `backend/src/admin/admin-license.controller.ts` | 激活/解绑/查询激活数接口 |
| 管理后台页面 | `admin/src/views/system/license.vue` | 「系统授权」页 |
| 许可证服务器 | `license-server/` | 独立 Express + SQLite 服务，负责激活计数、心跳、远程吊销 |
| 备份脚本 | `license-server/backup.sh` | 在线备份 SQLite 数据，配合 crontab 定时执行 |
| 恢复脚本 | `license-server/restore.sh` | 从备份恢复，或用于跨服务器迁移 |

### 脚本清单（详解）

| 脚本 | 位置 | 作用 | 何时运行 |
|------|------|------|----------|
| `generate-license.js` | 仓库根目录 | 授权方本机用私钥签发 License Key | 手动（新客户 / 续费 / 换发） |
| `license-server/backup.sh` | `license-server/` | 在线一致性备份授权台账 SQLite（`license.db`） | crontab 每天 04:00 |
| `license-server/restore.sh` | `license-server/` | 用备份恢复授权台账，或跨服务器迁移 | 手动（灾难恢复 / 迁移） |
| `scripts/backup.sh` | `scripts/` | MySQL 主库 `mysqldump` 备份 + gzip + 可选 OSS 上传 | crontab 每天 03:00 |
| `scripts/restore.sh` | `scripts/` | 从 `.sql.gz` 备份恢复 MySQL 主库 | 手动（灾难恢复） |
| `scripts/monitor.sh` | `scripts/` | 监控服务/磁盘/内存/API/MySQL/Redis，超阈值告警（企业微信/钉钉） | crontab 每 10 分钟 |
| `scripts/cleanup.sh` | `scripts/` | 清理应用日志 / Nginx 日志 / MySQL 慢查询 / Docker 资源 / 临时文件 | 手动或按需 cron |
| `scripts/deploy.sh` | `scripts/` | 一键部署：拉代码、构建、启动、健康检查 | 手动 |
| `scripts/install.sh` | `scripts/` | 一键初始化安装（Ubuntu/CentOS） | 手动（首次） |
| `scripts/setup-ssl.sh` | `scripts/` | 申请 / 续期 Let's Encrypt 证书 | 手动（首次 / 证书异常） |
| `scripts/generate-schema.sh` | `scripts/` | 从 TypeORM Entity 生成权威建表 `schema.sql` | 手动（实体变更后） |
| `scripts/query-realname.sh` | `scripts/` | 查询实名认证数据（支持解密、去重排查） | 手动（运维排查） |

> 只有 `scripts/backup.sh`、`scripts/monitor.sh`、`license-server/backup.sh` 进了 crontab；其余均为手动运维脚本。

### 备份文件位置一览

| 备份内容 | 位置 | 生成者 | 说明 |
|---------|------|--------|------|
| MySQL 主库（每日） | `/usr/local/src/qiyuanshe/backups/qys_YYYYMMDD_HHMMSS.sql.gz` | `scripts/backup.sh` | 业务库全量备份，保留 30 天 |
| 授权台账（每日） | `/usr/local/src/qiyuanshe-license/backups/license_YYYYMMDD_HHMMSS.db` | `license-server/backup.sh` | 授权 / 吊销 / 激活记录，保留 30 份 |
| 授权台账（运行中） | `/usr/local/src/qiyuanshe-license/data/license.db`（含 `-wal` / `-shm`） | license-server 运行时 | 当前库，勿手动删除 |
| 恢复前留底 | `/usr/local/src/qiyuanshe-license/data/license.db.pre-restore.<时间戳>` | `license-server/restore.sh` | 恢复前的自动留底 |
| crontab 快照 | `/usr/local/src/qiyuanshe/backups/crontab_backup_*.txt` | 手动导出 | 计划任务历史记录 |
| 历史备份（旧库名） | `/usr/local/src/qiyuanshe/backups/lingtong_*.sql.gz` | 旧版 `scripts/backup.sh` | 旧库 `lingtong_match` 时期产物 |
| 上线前手动备份 | `/usr/local/src/qiyuanshe/backups/qys_match_pre_launch_*.sql.gz` | 手动 | 上线前的全量备份 |

### 计划任务（crontab）

生产环境 crontab 完整内容（每条均带注释，便于识别）：

```cron
# ============================================================
# 栖缘社生产环境计划任务
# 脚本目录：/usr/local/src/qiyuanshe/scripts/（主项目）
#          /usr/local/src/qiyuanshe-license/（许可证服务器）
# ============================================================

# 腾讯云 stargate 安全监控 agent（系统自带，请勿删除）
*/5 * * * * flock -xn /tmp/stargate.lock -c '/usr/local/qcloud/stargate/admin/start.sh > /dev/null 2>&1 &'

# SSL 证书自动续期（Let's Encrypt，每天 02:00，webroot 方式）
0 2 * * * certbot renew --quiet --webroot -w /usr/local/src/qiyuanshe/docker/nginx/certbot/www

# MySQL 主库在线备份（每天 03:00）→ backups/qys_*.sql.gz，保留 30 天
0 3 * * * cd /usr/local/src/qiyuanshe && bash scripts/backup.sh >> logs/backup.log 2>&1

# 许可证服务器授权台账备份（每天 04:00）→ backups/license_*.db，保留 30 份
0 4 * * * cd /usr/local/src/qiyuanshe-license && bash ./backup.sh ./backups 30 >> ./backups/backup.log 2>&1

# 系统资源监控告警（每 10 分钟）→ 日志 logs/monitor.log
*/10 * * * * cd /usr/local/src/qiyuanshe && bash scripts/monitor.sh > /dev/null 2>&1
```

---

## 三、密钥管理

### 3.1 密钥与目录

- 私钥 `license_private.pem` 只保存在**授权方本机**，建议固定目录 `~/license-keys/`。
- 签发脚本 `generate-license.js` 在仓库根目录，同样只在本机执行。
- 公钥硬编码进代码（后端与 license-server），**服务器上不需要存放任何密钥文件**。

生成密钥对（如已存在可跳过）：

```bash
mkdir -p ~/license-keys && cd ~/license-keys
openssl genrsa -out license_private.pem 2048
openssl rsa -in license_private.pem -pubout -out license_public.pem
```

后端在 `backend/src/license/license.service.ts` 硬编码公钥 `LICENSE_PUBLIC_KEY`，许可证服务器在 `license-server/src/license-key.js` 硬编码 `PUBLIC_KEY`，二者必须为同一公钥。

若重新生成密钥对，需把 `license_public.pem` 内容同步替换到上述两处（保留 `-----BEGIN/END PUBLIC KEY-----`）。

### 3.2 私钥丢失怎么办

**先认清后果**——私钥丢失不等于系统立刻瘫痪：

- ❌ 无法再签发新 License Key（新客户、续费、换发都做不了）。
- ✅ 已签发的 key 仍然有效：验签用的是**公钥**（硬编码在代码里，没丢）。
- ✅ 已激活的客户不受影响，继续正常运行。

**预防（务必执行）**：私钥做**离线加密备份**至少两处（移动硬盘 / 密码管理器 / 云 KMS）。私钥绝不能提交到 git 仓库或上传服务器。

**丢失后的恢复步骤**（破坏性操作，会导致旧 key 全部失效）：

```bash
# 1. 重新生成密钥对
mkdir -p ~/license-keys-new && cd ~/license-keys-new
openssl genrsa -out license_private.pem 2048
openssl rsa -in license_private.pem -pubout -out license_public.pem
cat license_public.pem   # 复制新公钥内容
```

2. 把新公钥替换到 `backend/src/license/license.service.ts` 的 `LICENSE_PUBLIC_KEY` 和 `license-server/src/license-key.js` 的 `PUBLIC_KEY`。
3. 重新部署后端与 license-server，使新公钥生效（此刻起旧 key 全部验签失败）。
4. **导出客户清单**（从许可证服务器 SQLite 读取，作为重签发台账）：

   ```bash
   docker exec qys_license node -e "const db=require('better-sqlite3')('/app/data/license.db'); for(const r of db.prepare('SELECT customer_id,customer_name,expires_at,max_activations,domain,status FROM licenses ORDER BY id').all()) console.log([r.customer_id,r.customer_name,r.expires_at,r.max_activations,r.domain||'',r.status].join(' | '));"
   ```

   输出形如 `C20260901001 | 某某婚恋工作室 | 2027-01-01 | 1 | * | active`，逐行对应一个客户。

5. **逐客户重新签发**（授权方本机，用新私钥）：

   ```bash
   cd /path/to/qiyuanshe-match
   node generate-license.js ~/license-keys-new/license_private.pem
   ```

   按第 4 步清单，为每个客户输入**相同的**「客户ID / 客户名称 / 过期时间 / 最大激活次数 / 域名」，得到新的 License Key 与新的授权签名（`signature`）。

6. **更新许可证服务器签名**：新 key 的签名与库中旧签名不同，需让服务器按 `customerId` 复用并更新。推荐直接让客户重新激活（`POST /api/activate` 会按 `customerId` 命中旧记录，自动更新 `license_signature` / `expires_at` / `max_activations` 并置为 `active`），无需手动改库。

7. **通知客户重新激活**：把新 key 发给客户，客户登录管理后台「系统授权」页，先「解绑当前服务器」释放旧名额，再粘贴新 key 点激活。

> 结论：私钥丢失可恢复，但代价大，核心是提前做好离线备份。

> ⚠️ 重签期间旧 key 全部失效：公钥已换，客户本地旧 key 验签失败进入 `unauthorized`，写功能被锁定，需尽快完成所有客户重新激活。
>
> ⚠️ 吊销状态会复位：重新激活会把该授权记录 `status` 置为 `active` 并清空 `revoked_at`。若重签前有已吊销客户，重签后需在管理面板对其重新「吊销」。
>
> ⚠️ 激活名额：重新激活前先让客户「解绑当前服务器」，否则旧激活实例仍占用名额，可能触发「激活次数已达上限」。

> ⚠️ 私钥 `license_private.pem` 绝不能提交到仓库或上传服务器。

---

## 四、签发 License Key

在**授权方本机**执行（签发脚本与私钥都不在服务器上）。私钥路径按实际存放位置填写，本示例为 `~/license-keys/license_private.pem`：

```bash
cd /path/to/qiyuanshe-match          # 仓库根目录
node generate-license.js ~/license-keys/license_private.pem
```

按提示输入：

| 提示 | 说明 |
|------|------|
| 客户ID | 如 `C20260901001`（必填） |
| 客户名称 | 如「某某婚恋工作室」（必填） |
| 绑定域名 | `*` 表示不限，或填具体域名 |
| 过期时间 | `YYYY-MM-DD` |
| 授权状态 | `valid` / `grace_period` / `expired`（默认 `valid`） |
| 最大激活次数 | 默认 `1`，即最多激活 1 台服务器 |

脚本输出：

1. **License Key**：Base64 编码的 `{ payload, signature }`，发给客户用于激活。
2. **授权信息**：payload 明文（含 `maxActivations`）。
3. **预录入信息**：客户ID + 授权签名（`signature`），用于在许可证服务器登记，实现远程吊销。

---

## 五、部署许可证服务器（license-server）

`license-server/` 是**完全独立**的服务，不依赖主项目的 Docker 网络，可部署到任意服务器（与主项目同机，或独立一台均可）。建议目录 `/usr/local/src/qiyuanshe-license/`。

> 后端通过 `LICENSE_SERVER_URL` 环境变量指向 license-server 的地址（内网 IP 或域名），因此 license-server 迁移到新服务器时，只需更新后端这一处配置即可，不影响已激活客户（本地验签兜底）。

### 1. 拷贝代码并配置

```bash
# 在服务器上（假设主项目已 clone 到 /usr/local/src/qiyuanshe）
mkdir -p /usr/local/src/qiyuanshe-license
cp -r /usr/local/src/qiyuanshe/license-server/. /usr/local/src/qiyuanshe-license/
cd /usr/local/src/qiyuanshe-license

# 设置鉴权密钥（务必替换为强随机值）：
#   ADMIN_KEY    —— 管理面板接口鉴权（请求头 X-Admin-Key）
#   CLIENT_SECRET—— 客户端接口鉴权（客户后端调用 /api/activate 等需携带 X-License-Secret）
echo "ADMIN_KEY=$(openssl rand -hex 24)" > .env
echo "CLIENT_SECRET=$(openssl rand -hex 24)" >> .env
```

### 2. 配置端口绑定并启动

默认仅本机监听（`127.0.0.1:3002`）。若需让后端容器访问（同机部署的后端或远程后端），需把端口绑定到内网 IP 或 `0.0.0.0`：

```bash
# 同机部署：绑定宿主机内网 IP，后端容器经 http://内网IP:3002/api 访问
echo "LICENSE_BIND=10.0.16.3" >> .env   # 换成你的服务器内网 IP

# 独立部署（单独一台服务器）：绑定 0.0.0.0 或该机内网 IP
echo "LICENSE_BIND=0.0.0.0" >> .env

docker compose up -d --build
docker compose ps
```

容器信息：

| 项 | 值 |
|----|----|
| 容器名 | `qys_license` |
| 内部端口 | `3002` |
| 宿主机映射 | `${LICENSE_BIND:-127.0.0.1}:3002`（默认仅本机，可改为内网 IP / `0.0.0.0`） |
| 网络 | 独立（不依赖主项目网络，可单独迁移到任意服务器） |
| 数据 | `./data/license.db`（SQLite，随卷持久化） |
| 鉴权 | 管理接口需 `X-Admin-Key`；客户端接口需 `X-License-Secret`，均未配置时 fail-closed |

### 3. 主域名反代（推荐，隐藏源站 IP）

为避免 license-server 的公网 IP/域名直接暴露，推荐复用主项目已有的公网域名反代：license-server 继续只绑内网，客户后端经主域名访问客户端接口，管理面不对外。

`docker/nginx/nginx.conf`（及 `nginx.conf.example`）已内置如下配置，部署时按需把 `10.0.16.3` 换成 license-server 所在宿主机内网 IP：

```nginx
upstream license_upstream {
    server 10.0.16.3:3002;   # license-server 所在宿主机内网 IP
}

# 屏蔽管理面与健康检查，仅暴露客户端接口
location ~ ^/license/(api/admin|health) { return 404; }

location /license/ {
    proxy_pass http://license_upstream/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> - 客户后端 `LICENSE_SERVER_URL` 填 `https://你的域名/license/api`。
> - license-server 端口 3002 **不要在任何公网安全组放行**，仅在宿主机内网可达（`LICENSE_BIND=内网IP`）。
> - 管理面板仍走 SSH 隧道，**绝不要反代到公网**。

---

## 六、部署客户端（后端）

### 1. 配置环境变量

在项目根目录 `.env` 中配置：

```env
# 指向 license-server 的 /api 前缀（后端会在此后拼接 /activate、/heartbeat、/deactivate、/activations）。
# 推荐经主域名反代：https://你的域名/license/api（license-server 不出公网，见「五.3」）。
# 留空或不可达时会降级为离线激活（见「六.2」）。
LICENSE_SERVER_URL=https://你的域名/license/api
# 客户端接口鉴权密钥，必须与 license-server 的 CLIENT_SECRET 一致
LICENSE_SERVER_SECRET=<与 CLIENT_SECRET 相同的强随机值>
# 当前部署域名，上报给许可证服务器用于展示实例归属
APP_DOMAIN=你的域名
```

> ⚠️ `LICENSE_SERVER_URL` 必须指向 `/api` **前缀**，不要写成 `/api/verify`（那是完整端点，写成它会拼接出 `/api/verify/activate` 等错误路径）。

### 2. 离线激活（服务器不可达兜底）

激活时若许可证服务器不可达（网络类错误），后端会**降级为离线激活**：

- 本地 RSA 验签通过即写入激活记录，`activationId` 为空，系统按本地过期时间运行（`valid` / `expired`）。
- 离线激活**不受在线激活次数（maxActivations）约束**——这是无法在线计数时的固有代价，本地仍受「过期时间」约束。
- 后续每天心跳在线时，会自动对账补齐 `activationId`（恢复在线解绑 / 激活计数能力）；若此时发现已达激活上限，仅记录日志、不锁定客户。

> 未配置 `LICENSE_SERVER_URL` 时同样走离线激活，等同「纯离线模式」，但无法在线解绑 / 远程吊销 / 查询激活数。

### 3. 拉取并重建

```bash
ssh sh-th
cd /usr/local/src/qiyuanshe/
git pull
docker compose up -d --build
sleep 3 && docker compose ps
```

### 4. 数据库迁移

后端容器启动时自动执行 `migration:run`，无需手动操作：

- `1757000000000-CreateSystemLicensesTable`：创建 `system_licenses` 表（含 `activationId`）。
- `1757000000001-AlterSystemLicensesDropMachineFingerprint`：删除旧方案 `machineFingerprint` 列、补加 `activationId`（对老库/新库均安全）。

许可证服务器启动时，`db.js` 会自动创建 `licenses` / `activations` 表，并删除旧库中的 `machine_fingerprint` 列。

> ⚠️ 新代码为 fail-closed，重建后、激活前线上系统处于锁定状态，请尽快激活。

---

## 七、激活与日常运维

### 1. 激活 License

登录管理后台 →「系统授权」页，粘贴签发的 License Key，点击激活。

后端流程：本地 RSA 验签 → 调用许可证服务器 `POST /api/activate` 注册激活（校验 `maxActivations`）→ 写入本地 `system_licenses`（保存 `activationId`）。

> 许可证服务器不可达时降级为离线激活（见「六.2」），`activationId` 为空。

### 2. 解绑当前服务器

「系统授权」页点击「解绑当前服务器」，后端调用 `POST /api/deactivate` 释放当前 `activationId` 对应的激活名额。

### 3. 查看激活实例

「系统授权」页展示「激活实例数 / 最大激活数」（如 `2 / 5`）。

### 4. 远程吊销

在许可证服务器管理面板对某授权执行「吊销」。客户后端下次心跳（最长 24 小时）收到 `revoked` 状态，进入 7 天宽限期后锁定写功能。

### 5. 恢复已吊销授权

管理面板对已吊销记录点「恢复」（调用 `PUT /api/admin/licenses/:id`，传 `status:'active'`）。客户后端下次心跳（最长 24 小时）收到 `valid` 后恢复。宽限期（7 天）内恢复可即时解锁；即便超期被锁定，恢复后下次心跳也会解锁。

### 6. 备份（backup.sh）

在线一致性备份 SQLite 数据，无需停机（优先宿主机 `sqlite3`，否则回退到容器内 better-sqlite3）：

```bash
cd /usr/local/src/qiyuanshe-license
./backup.sh ./backups 30          # 备份到 backups/，保留最近 30 份
```

定时备份（crontab，每天凌晨 2 点）：

```cron
0 2 * * * cd /usr/local/src/qiyuanshe-license && ./backup.sh ./backups 30 >> ./backups/backup.log 2>&1
```

异地备份（再防一层，同步到另一台机器 / 对象存储）：

```bash
rsync -avz /usr/local/src/qiyuanshe-license/backups/ backup@异地机器:/backup/license/
```

### 7. 迁移 / 恢复（restore.sh）

跨服务器迁移或灾难恢复：

```bash
# 源机：备份
cd /usr/local/src/qiyuanshe-license && ./backup.sh
scp backups/license_*.db 新服务器:/tmp/

# 目标机：先部署（拷贝代码 + 配 .env + docker compose up -d --build），再恢复
cd /usr/local/src/qiyuanshe-license && ./restore.sh /tmp/license_*.db
curl http://127.0.0.1:3002/health     # 期望 {"success":true,"status":"ok"}
```

`restore.sh` 会自动：停止容器 → 留底当前库（`license.db.pre-restore.<时间戳>`）→ 覆盖数据库并清理 WAL/SHM → 重启容器。

#### 7.1 把 license-server 迁移到独立的新服务器

license-server 不依赖主项目网络，可整体搬到任意一台服务器：

1. **新服务器部署**：拷贝 `license-server/` 目录 → `echo "ADMIN_KEY=..." > .env` → `echo "LICENSE_BIND=0.0.0.0" >> .env` → `docker compose up -d --build`。
2. **迁移数据**：把源机 `backups/license_*.db` 用 `scp` 传到新服务器，再执行 `restore.sh` 恢复。
3. **改后端指向**：在**主项目** `.env` 中把 `LICENSE_SERVER_URL` 改成新服务器地址，如 `http://新服务器内网IP:3002/api`，然后 `docker compose up -d` 重启后端。
4. **验证**：新服务器 `curl http://127.0.0.1:3002/health`；主项目后端次日 03:00 心跳或手动激活一次确认连通。

> 迁移期间已激活客户不受影响（本地验签兜底）；只有「新激活 / 续费 / 解绑」需等待第 3 步后端指向新地址后恢复。

> 说明：license-server 数据丢失不会让已激活客户「无法激活/无法用」（客户本地验签兜底），备份的核心价值是保住**吊销记录**与**激活计数台账**，便于审计与快速恢复管控能力。

---

## 八、API 端点

### 客户端（后端调用，服务器到服务器）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/activate` | 激活：RSA 验签 + 配额检查 + 分配 `activationId` |
| POST | `/api/deactivate` | 解绑：删除指定 `activationId` 的激活实例 |
| POST | `/api/heartbeat` | 心跳：更新激活时间戳并返回远程状态 |
| GET | `/api/activations?licenseSignature=` | 查询激活实例数与列表 |
| POST | `/api/verify` | 兼容旧客户端的远程状态查询 |

### 管理面板（需请求头 `X-Admin-Key`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/licenses` | 列出所有授权记录 |
| POST | `/api/admin/licenses` | 预录入授权（客户ID + 授权签名 + 过期时间） |
| PUT | `/api/admin/licenses/:id` | 延期 / 改状态 |
| POST | `/api/admin/licenses/:id/revoke` | 吊销授权 |
| GET | `/api/admin/activations/:licenseId` | 查看某授权的激活实例 |
| GET | `/api/admin/stats` | 统计看板 |

健康检查：`GET /health`。

### 后端管理后台接口（前端调用）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/license/status` | 当前授权状态 |
| POST | `/api/admin/license/activate` | 激活 / 更新 License Key |
| POST | `/api/admin/license/deactivate` | 解绑当前服务器 |
| GET | `/api/admin/license/activations` | 激活实例摘要 |

小程序公开状态接口：`GET /api/system/license`。

---

## 九、数据库

### 许可证服务器（SQLite）

`licenses`：客户授权记录（`customer_id`、`license_signature`、`status`、`expires_at`、`domain`、`max_activations` 等）。

`activations`：激活实例（`id`、`license_id`、`domain`、`ip`、`activated_at`、`last_heartbeat_at`、`status`）。

### 后端（MySQL）

`system_licenses`：本地激活记录（单条），含 `licenseKey`、`activationId`、`isActivated`、`expiresAt`、`features`、`remoteStatus` 等。

---

## 十、验证清单

1. `docker compose ps`：`qys_api`、`qys_license` 均 `healthy`。
2. 许可证服务器健康：`curl http://127.0.0.1:3002/health` 返回 `{"success":true,"status":"ok"}`。
3. 管理后台「系统授权」页显示「已授权 / 正常」，客户ID、激活实例数正确。
4. 小程序写功能正常，未被误锁。
5. 激活次数达到 `maxActivations` 时，再次激活返回「激活次数已达上限，请先解绑旧实例」。
6. 解绑后激活实例数减少，重新激活可成功。

---

## 十一、回滚

若部署后出现异常：

```bash
ssh sh-th
cd /usr/local/src/qiyuanshe/
git log --oneline -3          # 找到上一个正常提交
git checkout <上一步提交hash>
docker compose up -d --build
```

> 回滚后恢复旧版 fail-open 配置式授权，系统恢复可用。

---

## 十二、常见问题

**Q：客户服务器完全离线，能远程吊销吗？**

不能。远程吊销依赖心跳联网；离线时只能依赖 License Key 内的过期时间到期自动失效。

**Q：客户换服务器怎么处理？**

在许可证服务器管理面板对旧实例「解绑」（或客户在后台「解绑当前服务器」释放名额），然后用同一 License Key 在新服务器重新激活（占用一个新的激活名额）。

**Q：忘记 `ADMIN_KEY` 怎么办？**

`ADMIN_KEY` 保存在 `license-server/.env`，可查看后重启容器；修改后需 `docker compose up -d --build` 生效。

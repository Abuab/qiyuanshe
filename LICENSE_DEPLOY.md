# 栖缘社 License 授权系统 — 部署与运维说明

> 本文档覆盖「**License Key + 离线验签 + 机器指纹绑定**」授权方案从签发到部署、激活、运维的完整流程。

---

## 一、方案概述

授权方案为**纯离线**模式，核心机制：

- **RSA-SHA256 非对称签名**：授权方用私钥签发 License Key，客户后端用硬编码公钥验签。
- **机器指纹绑定（防复制）**：签发时可把 License Key 绑定到客户服务器的机器指纹（`/etc/machine-id`），后端每次验签时对比本机指纹，防止同一 License Key 被复制到其他服务器。
- **fail-closed**：无激活记录 / 验签失败时，后端按 `unauthorized` 处理，只保留只读白名单（浏览、实名认证），写功能被拦截。
- **无远程吊销、无激活计数**：纯离线模式不依赖任何许可证服务器，取消 License Key 只能靠客户自行停用；防复制完全依赖机器指纹绑定。

### 授权四态

| 状态 | 写操作 | 读操作 | 触发条件 |
|------|--------|--------|----------|
| `valid` | ✅ | ✅ | 已激活且未过期 |
| `grace_period` | ✅ | ✅ | 即将到期宽限期 |
| `expired` | ❌ | ✅ | 本地验签已过过期时间 |
| `unauthorized` | ❌ | ✅ | 未激活 / 验签失败 |

---

## 二、组件与文件清单

| 组件 | 路径 | 说明 |
|------|------|------|
| 签发脚本 | `generate-license.js` | 本地工具，用私钥签发 License Key，**私钥绝不提交** |
| 后端授权模块 | `backend/src/license/` | RSA 验签、机器指纹校验、授权状态 Guard |
| 后端实体 | `backend/src/entities/SystemLicense.ts` | `system_licenses` 表 |
| 后端迁移 | `backend/migrations/1757000000000*`、`1757000000001*`、`1757000000002*` | 建表与字段调整 |
| 管理后台接口 | `backend/src/admin/admin-license.controller.ts` | 状态查询 / 激活接口 |
| 管理后台页面 | `admin/src/views/system/license.vue` | 「系统授权」页 |

### 脚本清单（详解）

| 脚本 | 位置 | 作用 | 何时运行 |
|------|------|------|----------|
| `generate-license.js` | 仓库根目录 | 授权方本机用私钥签发 License Key | 手动（新客户 / 续费 / 换发） |
| `scripts/backup.sh` | `scripts/` | MySQL 主库 `mysqldump` 备份 + gzip + 可选 OSS 上传 | crontab 每天 03:00 |
| `scripts/restore.sh` | `scripts/` | 从 `.sql.gz` 备份恢复 MySQL 主库 | 手动（灾难恢复） |
| `scripts/monitor.sh` | `scripts/` | 监控服务/磁盘/内存/API/MySQL/Redis，超阈值告警（企业微信/钉钉） | crontab 每 10 分钟 |
| `scripts/cleanup.sh` | `scripts/` | 清理应用日志 / Nginx 日志 / MySQL 慢查询 / Docker 资源 / 临时文件 | 手动或按需 cron |
| `scripts/deploy.sh` | `scripts/` | 一键部署：拉代码、构建、启动、健康检查 | 手动 |
| `scripts/install.sh` | `scripts/` | 一键初始化安装（Ubuntu/CentOS） | 手动（首次） |
| `scripts/setup-ssl.sh` | `scripts/` | 申请 / 续期 Let's Encrypt 证书 | 手动（首次 / 证书异常） |
| `scripts/generate-schema.sh` | `scripts/` | 从 TypeORM Entity 生成权威建表 `schema.sql` | 手动（实体变更后） |
| `scripts/query-realname.sh` | `scripts/` | 查询实名认证数据（支持解密、去重排查） | 手动（运维排查） |

> 只有 `scripts/backup.sh`、`scripts/monitor.sh` 进了 crontab；其余均为手动运维脚本。

---

## 三、密钥管理

### 3.1 密钥与目录

- 私钥 `license_private.pem` 只保存在**授权方本机**，建议固定目录 `~/license-keys/`。
- 签发脚本 `generate-license.js` 在仓库根目录，同样只在本机执行。
- 公钥硬编码进后端代码，**服务器上不需要存放任何密钥文件**。

生成密钥对（如已存在可跳过）：

```bash
mkdir -p ~/license-keys && cd ~/license-keys
openssl genrsa -out license_private.pem 2048
openssl rsa -in license_private.pem -pubout -out license_public.pem
```

后端在 `backend/src/license/license.service.ts` 硬编码公钥 `LICENSE_PUBLIC_KEY`，即上述 `license_public.pem` 的内容（保留 `-----BEGIN/END PUBLIC KEY-----`）。

若重新生成密钥对，需把新公钥内容同步替换到该处。

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

2. 把新公钥替换到 `backend/src/license/license.service.ts` 的 `LICENSE_PUBLIC_KEY`。
3. 重新部署后端，使新公钥生效（此刻起旧 key 全部验签失败）。
4. 按客户台账（客户ID / 客户名称 / 过期时间 / 域名 / 机器指纹）**逐客户重新签发**，并把新 key 发给客户重新激活。

> 结论：私钥丢失可恢复，但代价大，核心是提前做好离线备份。

---

## 四、签发 License Key

在**授权方本机**执行（签发脚本与私钥都不在服务器上）：

```bash
cd /Users/kevin/Documents/trae_projects/qiyuanshe-match   # 仓库根目录
node generate-license.js ~/license-keys/license_private.pem
```

按提示输入：

| 提示 | 说明 |
|------|------|
| 客户ID | 如 `C20260901001`（必填） |
| 客户名称 | 如「某某婚恋工作室」（必填） |
| 绑定域名 | `*` 表示不限，或填具体域名 |
| 绑定机器指纹 | 可选，防复制；让客户在服务器上运行 `cat /etc/machine-id` 获取 |
| 授权天数 | 整数（如 `365`），填了会自动计算到期日；直接回车则改为填写下面的过期时间 |
| 过期时间 | `YYYY-MM-DD`（仅当「授权天数」留空时填写） |
| 授权状态 | `valid` / `grace_period` / `expired`（默认 `valid`） |

脚本输出：

1. **License Key**：Base64 编码的 `{ payload, signature }`，发给客户用于激活。
2. **授权信息**：payload 明文（含 `machineId`，若已绑定）。
3. **机器指纹绑定提示**：是否已绑定机器指纹。

> 绑定机器指纹后，客户服务器必须保证 `LICENSE_MACHINE_ID`（或后端自动采集的 `/etc/machine-id`）与该值一致，否则无法激活。

---

## 五、部署客户端（后端）

### 1. 配置环境变量

在项目根目录 `.env` 中配置（详见 `.env.example` 的 License 段落）：

```env
# 机器指纹（可选）。留空时后端自动采集 /etc/machine-id → 容器 hostname。
# 建议显式配置为宿主机 `cat /etc/machine-id` 的值。
LICENSE_MACHINE_ID=
```

`docker-compose.yml` 已把宿主机 `/etc/machine-id` 以只读方式挂载进 api 容器（`/etc/machine-id:/etc/machine-id:ro`），保证容器内外机器指纹一致。

### 2. 拉取并重建

```bash
ssh sh-th
cd /usr/local/src/qiyuanshe/
git pull
docker compose down
docker compose up -d --build
sleep 3 && docker compose ps
```

### 3. 数据库迁移

后端容器启动时自动执行 `migration:run`，无需手动操作：

- `1757000000000-CreateSystemLicensesTable`：创建 `system_licenses` 表。
- `1757000000001-AlterSystemLicensesDropMachineFingerprint`：清理旧方案 `machineFingerprint` 列。
- `1757000000002-AlterSystemLicensesDropOnlineFields`：删除在线授权遗留的 `activationId`、`remoteStatus`、`remoteStatusUpdatedAt` 三个字段（按 information_schema 判断，对老库/新库均安全）。

> ⚠️ 新代码为 fail-closed，重建后、激活前线上系统处于锁定状态，请尽快在管理后台激活。

---

## 六、激活与日常运维

### 1. 激活 License

登录管理后台 →「系统授权」页，粘贴签发的 License Key，点击「激活 / 更新」。

后端流程：本地 RSA 验签 → 校验机器指纹 → 写入本地 `system_licenses` 记录。

### 2. 续费 / 换发

到期或需要延期时，用签发脚本重新生成新的 License Key（客户ID / 客户名称保持一致），发给客户在「系统授权」页重新激活即可，旧记录被覆盖。

### 3. 客户换服务器

客户换服务器（机器指纹变化）时，需按新服务器的机器指纹重新签发 License Key。若签发时未绑定机器指纹，则同一 License Key 可直接复制到新服务器激活（无防复制保护）。

---

## 七、API 端点

### 后端管理后台接口（前端调用）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/license/status` | 当前授权状态 |
| POST | `/api/admin/license/activate` | 激活 / 更新 License Key |

小程序公开状态接口：`GET /api/system/license`。

---

## 八、数据库

### 后端（MySQL）

`system_licenses`：本地激活记录（单条），含 `licenseKey`、`isActivated`、`expiresAt`、`features`、`customerId`、`customerName`、`activatedAt`、`createdAt`、`updatedAt`。

---

## 九、验证清单

1. `docker compose ps`：`qys_api` 等容器均 `healthy`。
2. 管理后台「系统授权」页显示「已授权 / 正常」，客户ID、过期时间正确。
3. 小程序写功能正常，未被误锁。
4. 将同一 License Key 复制到另一台机器指纹不同的服务器激活，应报「机器指纹不匹配」（仅在绑定了机器指纹时验证）。

---

## 十、回滚

若部署后出现异常：

```bash
ssh sh-th
cd /usr/local/src/qiyuanshe/
git log --oneline -3          # 找到上一个正常提交
git checkout <上一步提交hash>
docker compose up -d --build
```

---

## 十一、常见问题

**Q：能远程吊销某个客户吗？**

不能。纯离线模式无许可证服务器，无法远程吊销。取消授权只能要求客户停用，或依靠 License Key 内的过期时间到期自动失效。

**Q：同一 License Key 能被复制到多台服务器吗？**

若签发时绑定了机器指纹，则不能——其他服务器机器指纹不匹配，验签失败进入 `unauthorized`。若签发时未绑定机器指纹，则可复制，因此建议正式交付时一律绑定机器指纹。

**Q：客户服务器重装导致 `/etc/machine-id` 变化怎么办？**

重装系统可能改变 `/etc/machine-id`，导致原绑定指纹失效。需联系授权方按新指纹重新签发 License Key。

# 栖缘社 License 授权系统 — 部署与运维说明

> 本文档覆盖「License Key + 激活次数限制 + 在线校验」授权方案从签发到部署、激活、运维的完整流程。

---

## 一、方案概述

授权方案已从早期的「机器指纹强绑定」演进为「**License Key + 激活次数限制 + 在线校验**」，核心机制：

- **RSA-SHA256 非对称签名**：授权方用私钥签发 License Key，客户部署的后端用硬编码公钥验签；许可证服务器也用同一公钥验签。
- **激活次数限制**：一个 License Key 最多可在 N 台服务器上激活（`maxActivations`，默认 1）。许可证服务器为每个激活分配唯一 `activationId`，用于心跳、解绑与去重。
- **在线校验**：客户后端激活时在线注册，之后每天凌晨 3 点向许可证服务器心跳，支持远程吊销。
- **fail-closed**：无激活记录 / 验签失败 / 许可证服务器不可达时，后端按 `unauthorized` 处理，只保留只读白名单（浏览、实名认证），写功能被拦截。

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

---

## 三、密钥管理

后端在 `backend/src/license/license.service.ts` 中硬编码了公钥 `LICENSE_PUBLIC_KEY`，签发时必须使用与之配对的私钥。

生成密钥对（如已存在可跳过）：

```bash
mkdir -p ~/license-keys && cd ~/license-keys
openssl genrsa -out license_private.pem 2048
openssl rsa -in license_private.pem -pubout -out license_public.pem
```

- 若重新生成密钥对，需将 `license_public.pem` 的内容同步替换到后端 `LICENSE_PUBLIC_KEY`（保留 `-----BEGIN/END PUBLIC KEY-----`）。
- 许可证服务器 `license-server/src/license-key.js` 中也硬编码了同一公钥，用于 `/api/activate` 的本地验签。

> ⚠️ 私钥 `license_private.pem` 绝不能提交到仓库或上传服务器。

---

## 四、签发 License Key

```bash
cd /Users/kevin/Documents/trae_projects/qiyuanshe-match
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

`license-server/` 是独立服务，不依赖主项目。建议部署到服务器 `/usr/local/src/qiyuanshe-license/`。

### 1. 拷贝代码并配置

```bash
# 在服务器上（假设主项目已 clone 到 /usr/local/src/qiyuanshe）
mkdir -p /usr/local/src/qiyuanshe-license
cp -r /usr/local/src/qiyuanshe/license-server/. /usr/local/src/qiyuanshe-license/
cd /usr/local/src/qiyuanshe-license

# 设置管理面板鉴权密钥（务必替换为强随机值）
echo "ADMIN_KEY=$(openssl rand -hex 24)" > .env
```

### 2. 启动

```bash
docker compose up -d --build
docker compose ps
```

容器信息：

| 项 | 值 |
|----|----|
| 容器名 | `qys_license` |
| 内部端口 | `3002` |
| 宿主机映射 | `127.0.0.1:3002`（仅本机，经 nginx 反代对外） |
| 网络 | `qiyuanshe_qys_network`（与后端 `qys_api` 同网络） |
| 数据 | `./data/license.db`（SQLite，随卷持久化） |
| 鉴权 | 管理接口需请求头 `X-Admin-Key`，未配置时 fail-closed |

### 3. 反向代理（可选）

如需通过公网域名访问管理面板，在 `qys_nginx` 中增加：

```nginx
server {
    listen 443 ssl;
    server_name license.你的域名;

    location / {
        proxy_pass http://qys_license:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> 后端容器与 `qys_license` 同网络，可直接用 `http://qys_license:3002` 访问，无需公网域名。

---

## 六、部署客户端（后端）

### 1. 配置环境变量

在项目根目录 `.env` 中新增（`LICENSE_SERVER_URL` 必须配置为许可证服务器地址，否则无法激活）：

```env
# 指向 /api 前缀，后端会在其后拼接具体端点
LICENSE_SERVER_URL=http://qys_license:3002/api
# 当前部署域名，上报给许可证服务器用于展示实例归属
APP_DOMAIN=你的域名
```

### 2. 拉取并重建

```bash
ssh sh-th
cd /usr/local/src/qiyuanshe/
git pull
docker compose up -d --build
sleep 3 && docker compose ps
```

### 3. 数据库迁移

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

### 2. 解绑当前服务器

「系统授权」页点击「解绑当前服务器」，后端调用 `POST /api/deactivate` 释放当前 `activationId` 对应的激活名额。

### 3. 查看激活实例

「系统授权」页展示「激活实例数 / 最大激活数」（如 `2 / 5`）。

### 4. 远程吊销

在许可证服务器管理面板对某授权执行「吊销」。客户后端下次心跳（最长 24 小时）收到 `revoked` 状态，进入 7 天宽限期后锁定写功能。

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

# License 授权状态控制 — 操作教程

> 适用版本：栖缘社婚恋交友平台（NestJS 后端 + uni-app 小程序）
> 最后更新：2026-08-31

本教程面向**平台运营/管理员**，说明如何给平台「上锁 / 解锁」——即通过设置 License 授权状态来控制小程序端哪些功能可用。

---

## 1. 一句话理解

系统有一个「授权开关」，存在数据库 `system_configs` 表的一条记录里（`configKey = license.config`，`configValue` 是一段 JSON）。

- 默认（数据库里没有这条记录）→ **`valid`（正常，全部功能可用）**
- 设置成 `expired` / `unauthorized` → **写功能禁用**（喜欢、聊天、红娘、AI、VIP、问答、人格测试提交等一律不可用），只保留「浏览 + 实名认证」这类只读功能。

> 核心原则：**功能可用性只看 `features` 白名单；`status` 只决定横幅文案和是否锁定。**

---

## 2. 四种授权状态

| 状态 | 含义 | 写操作 | 读操作 | 前端表现 |
|------|------|--------|--------|----------|
| `valid` | 正常授权 | ✅ 全部可用 | ✅ 全部可用 | 无提示，功能齐全 |
| `grace_period` | 宽限期（即将到期/宽限中） | ✅ 全部可用 | ✅ 全部可用 | 首页顶部显示「即将到期」横幅 |
| `expired` | 授权已过期 | ❌ 全部禁用 | ✅ 只读可用 | 写入口隐藏；强行调用写接口返回 403「系统授权已过期」 |
| `unauthorized` | 未授权（密钥/授权无效） | ❌ 全部禁用 | ✅ 只读可用 | 写入口隐藏；强行调用写接口返回 403「系统未授权」 |

> `grace_period` 只做「横幅提醒」，**不拦截任何功能**（全功能可用）。

---

## 3. 配置存储在哪

- 数据表：`system_configs`
- 配置键：`license.config`
- 配置值：一段 JSON 字符串，结构如下

```json
{
  "status": "valid",
  "expiresAt": "2026-12-31",
  "features": [],
  "lockMessage": ""
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | 字符串 | 是 | 四态之一：`valid` / `grace_period` / `expired` / `unauthorized`。填错会自动回退为 `valid` |
| `expiresAt` | 字符串 | 否 | 授权到期日（`YYYY-MM-DD`）。仅 `grace_period` 状态下会用它计算「剩余天数」显示在横幅上；其他状态可留空 |
| `features` | 数组 | 否 | 功能白名单。**日常操作留 `[]` 即可**（系统会自动按状态推导） |
| `lockMessage` | 字符串 | 否 | 自定义锁定提示文案。留空时使用默认文案「系统授权已过期 / 系统未授权」 |

### 关于 `features`（可忽略）

系统内置 14 个功能开关，仅在「锁定」状态下由系统强制收敛为只读白名单（`user_browse`、`realname_auth`）。**当前版本在 `valid` / `grace_period` 下不会按 `features` 做细粒度限制**，因此：

> **日常只需设置 `status` 和（可选）`expiresAt`，`features` 一律留 `[]` 即可。**

完整功能 key 列表（供参考）：

```
user_browse（浏览）、like（喜欢）、contact_apply（想认识Ta）、matchmaker（红娘牵线）、
ai_match（AI缘分）、ai_quiz（AI趣测）、ai_chat（AI红娘对话）、chat（私聊，已移除）、
dynamic_post（发动态，后台生成）、answer（回答）、vip（会员）、visitor_log（访客记录）、
personality_test（人格测试）、realname_auth（实名认证）
```

---

## 4. 操作步骤（命令行，推荐）

> 以下命令以 **Docker 部署** 为例（容器名 `qys_mysql`、库名 `qys_match`）。手动部署把 `docker exec -it qys_mysql mysql ...` 换成 `mysql -u root -p ...` 即可。

### 4.1 登录服务器

```bash
ssh sh-th          # 或你的实际 SSH 主机别名
```

### 4.2 进入 MySQL

```bash
docker exec -it qys_mysql mysql -uroot -p qys_match
```

> 提示输入密码时，粘贴 `.env` 里的 `MYSQL_ROOT_PASSWORD`（或你的 MySQL root 密码）。

### 4.3 查看当前授权配置

```sql
SELECT id, configKey, configValue, updatedAt
FROM system_configs
WHERE configKey = 'license.config';
```

- **查不到记录** → 当前是 `valid`（正常，全部功能可用）。
- **查得到记录** → `configValue` 里的 `status` 就是当前状态。

### 4.4 设置授权状态（按需执行其一）

#### 场景 A：恢复正常（valid，全部功能可用）

```sql
-- 若之前没有记录，用 INSERT
INSERT INTO system_configs (configKey, configValue, description)
VALUES ('license.config', '{"status":"valid","expiresAt":"","features":[],"lockMessage":""}', 'License 授权状态');

-- 若已有记录，用 UPDATE
UPDATE system_configs
SET configValue = '{"status":"valid","expiresAt":"","features":[],"lockMessage":""}'
WHERE configKey = 'license.config';
```

> 更简单的「恢复默认」：直接删除这条记录即可（系统缺省按 `valid` 处理）。

```sql
DELETE FROM system_configs WHERE configKey = 'license.config';
```

#### 场景 B：宽限期提醒（grace_period，功能仍全可用，首页显示即将到期横幅）

```sql
INSERT INTO system_configs (configKey, configValue, description)
VALUES ('license.config', '{"status":"grace_period","expiresAt":"2026-12-31","features":[],"lockMessage":""}', 'License 授权状态')
ON DUPLICATE KEY UPDATE
  configValue = VALUES(configValue);
```

> 把 `expiresAt` 改成你实际的授权到期日，横幅会显示「还剩 X 天」。若留空则显示通用提醒文案。

#### 场景 C：锁定平台（expired，写功能全部禁用，仅保留浏览）

```sql
INSERT INTO system_configs (configKey, configValue, description)
VALUES ('license.config', '{"status":"expired","expiresAt":"","features":[],"lockMessage":""}', 'License 授权状态')
ON DUPLICATE KEY UPDATE
  configValue = VALUES(configValue);
```

#### 场景 D：锁定平台（unauthorized，未授权/密钥无效，效果同 expired 但提示不同）

```sql
INSERT INTO system_configs (configKey, configValue, description)
VALUES ('license.config', '{"status":"unauthorized","expiresAt":"","features":[],"lockMessage":""}', 'License 授权状态')
ON DUPLICATE KEY UPDATE
  configValue = VALUES(configValue);
```

> `expired` 与 `unauthorized` 的**锁定效果完全相同**（写功能全禁用），区别只是前端弹窗文案：前者「系统授权已过期」，后者「系统未授权」。

### 4.5 退出 MySQL

```sql
EXIT;
```

---

## 5. 验证是否生效

### 5.1 用 API 直接验证（最快）

```bash
# 服务器上或本地执行（替换为你的域名）
curl https://yourdomain.com/api/system/license
```

返回示例（正常）：

```json
{"code":200,"message":"success","data":{"status":"valid","expiresAt":"","features":["user_browse","like","..."],"graceDaysLeft":0,"lockMessage":""}}
```

- `status` 应为刚设置的值。
- 设为 `expired`/`unauthorized` 后，`features` 应只剩 `["user_browse","realname_auth"]`。

### 5.2 小程序端验证

1. 完全退出小程序（从微信「最近使用」划掉，或开发者工具重新编译）。
2. 重新打开：
   - `valid`：功能齐全，无提示。
   - `grace_period`：首页顶部出现橙色「即将到期」横幅（可手动关闭）。
   - `expired`/`unauthorized`：用户卡片的「心动」、详情页的「想认识Ta/红娘牵线/AI」、问答的「回答」、VIP、AI 红娘输入框等**写入口全部消失**；若强行调用写接口，会弹出「系统授权异常」弹窗。

---

## 6. 常见问题（FAQ）

### Q1：改了配置，为什么没生效？

License 配置**直接读数据库，无缓存，实时生效**（无需重启服务）。若小程序端未更新，请确认：

1. SQL 确实执行成功（`SELECT` 复查 `configValue`）。
2. 小程序**完全退出后重新进入**（App 启动和从后台切回前台时会重新拉取授权状态）。

### Q2：数据库故障时会不会把平台误锁死？

不会。读取授权配置失败时系统**按 `valid` 处理**（fail-open），不会因配置表故障而锁死平台。

### Q3：`expired` 和 `unauthorized` 有什么区别？

功能锁定效果完全一致，仅前端提示文案不同。语义上：`expired` = 到期，`unauthorized` = 未授权/密钥无效。按业务含义二选一即可。

### Q4：我只想禁用某个功能，可以吗？

当前版本支持的是**整站级锁定**（过期/未授权时统一收敛为只读）。暂不支持在 `valid` 状态下单独关某个功能——这类细粒度开关请用管理后台已有的「功能开关」（聊天/VIP/喜欢/想认识Ta/红娘牵线等，见 README「功能开关」章节）。

### Q5：如何恢复出厂默认（完全正常）？

```sql
DELETE FROM system_configs WHERE configKey = 'license.config';
```

删除后系统缺省即为 `valid`。

---

## 7. 技术说明（开发/运维参考）

- 后端模块：`backend/src/license/`（`LicenseService` + 全局 `LicenseGuard` + `@RequireLicense()` 装饰器）。
- 公开状态接口：`GET /api/system/license`（`Cache-Control: no-store`，实时返回）。
- 写接口拦截：被标注 `@RequireLicense()` 的接口在 `expired`/`unauthorized` 下返回 HTTP 403，响应体含 `bizCode: "LICENSE_EXPIRED" | "LICENSE_INVALID"`。
- 前端状态管理：`src/store/license.ts`（`isFeatureEnabled(key)`），功能入口按 `features` 白名单显隐。
- 功能 key 常量：后端 `backend/src/license/license.service.ts` 与前端 `src/config/license-features.ts` 需保持一致。

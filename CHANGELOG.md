# Changelog

## 2026-09-10 — 登录风控（穷人版）

### 新增

- **Redis 原子限频**：`RedisService` 新增 `incrWithTtl`（Lua 原子 INCR + 首次 EXPIRE）与 `setNx`（一次性 nonce/token）。
  - 手机号：60s/1、1h/3、24h/5
  - IP：10min/10、24h/50
  - 设备指纹：24h/20
  - 短信验证码：5 分钟有效、连续输错 3 次作废
- **风控检查**：`GET /auth/risk/check` 返回 `{ needCaptcha }`，命中规则才要求图形验证，否则直接发短信。
  - 新设备 + 新 IP + 虚拟号段（170/171/165/162）
  - 同一 IP 1h ≥ 5 个手机号
  - 手机号/设备 24h 验证失败 ≥ 3 次
  - 0–6 点批量请求
- **自建图形验证码**：`GET /auth/captcha`（SVG base64，Redis TTL 120s，答案不落地）+ `POST /auth/captcha/verify`（成功签发一次性 `captchaToken`，3 次失败作废）。无第三方依赖。
- **captchaToken**：HMAC-SHA256 签名，绑定手机号 + IP + UA，5 分钟有效，一次性使用，不可跨场景复用。
- **防重放**：`timestamp` + `nonce`（±5 分钟窗口，nonce `SET NX` 一次性）。
- **设备指纹**：前端仅采集 UA/品牌/机型/系统/屏幕/时区并做不可逆哈希，不采集敏感信息。

### 变更

- `sms-code` 接口改造：接入限频 + 风控 + 防重放，命中风控时强制 `captchaToken`。
- `sms-login` 接口透传 `deviceFingerprint`，用于验证失败次数风控。
- 小程序/H5 登录页接入图形验证码流程与设备指纹上报。
- `docker/mysql/init.sql` 隐私政策种子数据补充设备指纹风控条款。
- 管理后台「协议管理」隐私政策通过 Seeder 幂等补充设备指纹风控条款（存量部署启动时自动追加）。

### 配置

- 新增环境变量 `RISK_HMAC_SECRET`（生产必填，缺失启动失败；生成：`openssl rand -hex 32`）。

### 说明

- 统一错误文案「操作过于频繁，请稍后再试」，不对外泄露限频规则。
- 强依赖 Redis，Redis 不可用时相关接口失败，不静默降级。

# Debug: voice-audit-tmp-url

## Status
[OPEN]

## Symptoms
- 管理后台语音审核无法播放，浏览器请求 URL 为 `https://tmp/YSYWV71YZ_M_79e24d63c78e2dbf1f31ebdf8c090fb6.durationTime=1691.mp3`
- AI 已配置，但审核列表仍显示 "AI 未配置，请人工审核"
- 通知日志操作列按钮换行
- 存在 `voice_audit` 来源的通知记录，期望只有 `voice_upload`

## Hypotheses
1. H1: 服务器未部署最新代码
2. H2: 小程序端上传逻辑未生效
3. H3: 数据库记录是修复前遗留的脏数据
4. H4: AI 展示逻辑来自旧前端资源或未写入 aiResult
5. H5: voice_audit 记录来自修复前未处理的审批请求

## Evidence Log

### 2026-06-26 服务器代码版本检查
- 服务器路径: `/usr/local/src/qiyuanshe`
- Git log 最新提交: `3be4356 fix: AI转录异步不阻塞+反向代理URL修复+SSRF防御+移除as any`
- GitHub 最新提交: `0d8ad4b fix: 语音上传不存临时路径+操作列按钮同行+审批不通知voice+AI展示统一`
- 结论: **服务器代码未更新到 GitHub 最新提交 (H1 成立)**

### 2026-06-26 后端代码检查
- `dist/user/user.service.js` 中没有 `isWechatTempPath` 和 "语音文件未上传" 字符串
- `dist/admin/audit.controller.js` 中仍有 `source: 'voice_audit'`
- 结论: 后端上传校验和通知移除逻辑未部署

### 2026-06-26 数据库检查
- audit_logs ID 104 创建时间: 2026-06-26 05:16:15
- content: `{"voiceUrl":"http://tmp/YSYWV71YZ_M_79e24d63c78e2dbf1f31ebdf8c090fb6.durationTime=1691.mp3","duration":2,"transcript":null}`
- aiResult: `AI转录失败`, aiScore: 0.00
- 结论: 记录由旧代码创建，小程序端未上传文件即提交了临时路径

### 2026-06-26 根因确认
所有问题均由 **服务器未部署最新代码** 导致：
1. 无法播放: 旧代码允许 `http://tmp/` 进入数据库
2. AI 未配置: 旧前端 admin 代码仍会显示该文案
3. voice_audit 通知: 旧后端 audit.controller 仍会发送
4. 操作列换行: 旧前端 admin 未修复按钮容器

## Next Action
执行服务器部署更新到 `0d8ad4b`。

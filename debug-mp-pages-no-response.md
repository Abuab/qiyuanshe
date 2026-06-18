# Debug Session: mp-pages-no-response

**Status**: [OPEN]
**Created**: 2026-06-18
**Symptoms**:
- 我的相册/爱情语录/隐私设置/黑名单 点击均无反应
- VIP会员页支付失败，套餐不展示
- 我看过谁显示空头像/用户/暂无信息
- 手动置顶非实名用户出现在实名/最新列表

## Hypotheses

### H1: 微信开发者工具未加载最新 dist 构建
- 观察点：dist 文件 mtime vs 开发者工具加载时间
- 验证方式：检查 dist 文件内容是否包含新代码

### H2: uni.navigateTo 导航路径不匹配
- 观察点：导航时是否抛出路径不存在错误
- 验证方式：在 my/index.vue 中拦截导航调用，记录实际路径

### H3: 小程序 app.json 未正确注册新页面
- 观察点：dist/build/mp-weixin/app.json 是否包含新页面路径
- 验证方式：直接读取 app.json

### H4: VIP 页面 API 请求静默失败
- 观察点：get('/vip/packages') 返回内容和 HTTP 状态码
- 验证方式：拦截 request 调用，记录响应

### H5: 足迹页后端返回数据为空/不完整
- 观察点：/users/my-views API 响应体
- 验证方式：在 fetchList 中记录原始响应

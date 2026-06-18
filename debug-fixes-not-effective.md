# Debug Session: fixes-not-effective

**Status**: [OPEN]
**Created**: 2026-06-18
**Symptoms**: 用户反馈以下三个已修复的问题仍未生效
1. 小程序 VIP 会员页底部 tab 栏（首页/动态等）不展示
2. 我的→足迹→我看过谁：用户列表显示空头像、昵称"用户"、暂无信息
3. 手动置顶的非实名用户仍出现在实名用户列表和最新列表

## Hypotheses

### H1: 微信开发者工具未重新编译/缓存旧代码
- 观察点：dist 文件是否已更新、用户是否点击了编译
- 验证方式：检查服务器和本地 dist 是否包含最新代码

### H2: VIP 页面 tab-bar 组件本身存在渲染问题
- 观察点：tab-bar 组件是否被渲染、是否被其他元素遮挡
- 验证方式：在页面 onShow 中报告 tab-bar 组件状态和页面布局信息

### H3: "我看过谁"数据问题不是已删除用户，而是用户资料为空
- 观察点：数据库中这些用户的 nickname/avatar 是否为空
- 验证方式：直接查询 MySQL 中 profile_visits 关联用户数据

### H4: 后端 API 未正确过滤已删除用户（部署未生效）
- 观察点：/users/my-views 返回的列表中是否仍包含已删除用户
- 验证方式：使用有效 token 调用 API 查看响应

### H5: 实名筛选前端未传 isRealName 参数
- 观察点：/users/recommend?tab=verified 请求是否带 isRealName=1
- 验证方式：在前端请求拦截器中记录参数

### H6: 置顶用户本身在数据库中被标记为 isRealName=1
- 观察点：置顶用户的 isRealName 字段值
- 验证方式：查询 users 表中 pinnedExpireAt > now 的用户的 isRealName

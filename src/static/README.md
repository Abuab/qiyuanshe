# 灵通相亲小程序 - 图片素材清单

## 素材目录结构
```
static/
├── default-avatar.png          # 默认头像（已迁移至 static/icons/default_avatar.png）
├── heart.png                   # 开场爱心动画图标
├── matchmaker.png              # 红娘悬浮按钮图标
└── tabbar/
    ├── home-default.png        # 首页-未选中
    ├── home-active.png         # 首页-选中
    ├── dynamic-default.png     # 动态-未选中
    ├── dynamic-active.png      # 动态-选中
    ├── vip-default.png         # 会员-未选中
    ├── vip-active.png          # 会员-选中
    ├── message-default.png     # 消息-未选中
    ├── message-active.png      # 消息-选中
    ├── my-default.png          # 我的-未选中
    └── my-active.png           # 我的-选中
```

## 颜色规范
- 主色（选中状态）: #FF6B9D (RGB: 255, 107, 157)
- 未选中状态: #999999 (RGB: 153, 153, 153)
- 背景色: #FFF5F7 (RGB: 255, 245, 247)

## 尺寸规范
- 默认头像: 200x200px
- 爱心图标: 256x256px
- 红娘按钮: 128x128px
- 导航图标: 64x64px

## 使用说明
1. 将所有图片复制到 `miniprogram/static/` 目录下
2. 导航图标建议放在 `miniprogram/static/tabbar/` 子目录
3. 所有图片均为 PNG 格式，支持透明背景
4. 如需替换，请保持相同尺寸和命名规范

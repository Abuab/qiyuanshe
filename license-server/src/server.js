'use strict'

const path = require('path')
const express = require('express')
const verifyRouter = require('./routes/verify')
const adminRouter = require('./routes/admin')

const app = express()
const PORT = Number(process.env.PORT) || 3002

// 反向代理后正确识别客户端 IP（限流用）
app.set('trust proxy', 1)

app.use(express.json({ limit: '1mb' }))

// 健康检查
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' })
})

// 客户服务器验证接口（服务器到服务器，无需 CORS）
app.use('/api', verifyRouter)

// 管理面板接口
app.use('/api/admin', adminRouter)

// 管理面板静态页面
app.use(express.static(path.join(__dirname, '..', 'public')))

// 兜底 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not Found' })
})

// 全局错误处理（避免异常导致进程崩溃）
app.use((err, req, res, next) => {
  console.error('[license-server] 未捕获异常:', err)
  if (res.headersSent) return next(err)
  res.status(500).json({ success: false, message: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`[license-server] 已启动，监听端口 ${PORT}`)
})

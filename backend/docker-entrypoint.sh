#!/bin/sh
set -e

# ============================================
# 栖缘社 Docker 启动脚本
# 以 root 身份运行，创建上传/日志子目录并授权给 nestjs 用户
# 避免 bind mount 覆盖目录后 EACCES 崩溃
# ============================================

# 创建上传子目录（cert 用于管理后台证书上传）
mkdir -p /app/uploads/cert /app/logs

# 授权给 nestjs 用户（uid 1001, gid 1001）
chown -R 1001:1001 /app/uploads /app/logs 2>/dev/null || true

# 运行数据库迁移（TypeORM）
echo "[entrypoint] Running database migrations..."
npx typeorm migration:run -d dist/config/data-source.js || echo "[entrypoint] Migration failed, continuing..."

# 切换到 nestjs 用户启动应用
exec su-exec nestjs node dist/main.js

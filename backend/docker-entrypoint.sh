#!/bin/sh
set -e

# ============================================
# 栖缘社 Docker 启动脚本
# 以 root 身份运行，创建上传/日志子目录并授权给 nestjs 用户
# 避免 bind mount 覆盖目录后 EACCES 崩溃
# ============================================

# 创建上传/日志子目录
mkdir -p /app/uploads /app/logs

# 授权给 nestjs 用户（uid 1001, gid 1001）
chown -R 1001:1001 /app/uploads /app/logs 2>/dev/null || true

# 运行数据库迁移（TypeORM）
# 迁移均为幂等写法：全新部署（schema.sql 已建全表）时逐条跳过，升级时增量应用。
# 迁移失败应中断启动，避免应用运行在结构不一致的数据库上。
echo "[entrypoint] Running database migrations..."
if ! npx typeorm migration:run -d dist/config/data-source.js; then
  echo "[entrypoint] Migration failed, aborting startup" >&2
  exit 1
fi

# 切换到 nestjs 用户启动应用
exec su-exec nestjs node dist/main.js

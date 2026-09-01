#!/usr/bin/env bash
#
# 栖缘社 license-server 恢复 / 迁移脚本
#
# 用途：用备份文件恢复 license.db（恢复前自动停容器并留底当前库），
#       也用于跨服务器迁移：源机 backup.sh 生成备份 -> 拷贝到目标机 -> 目标机 restore.sh。
#
# 用法：
#   ./restore.sh <备份文件.db>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="${DATA_DIR:-$SCRIPT_DIR/data}"
CONTAINER="${CONTAINER:-qys_license}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "用法：./restore.sh <备份文件.db>" >&2
  echo "可用备份列表：" >&2
  ls -1t "$SCRIPT_DIR"/backups/license_*.db 2>/dev/null || echo "  （暂无备份）" >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[restore] 错误：备份文件不存在 $BACKUP_FILE" >&2
  exit 1
fi

# 1) 停止容器，避免恢复过程中有写入
if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "[restore] 停止容器 $CONTAINER ..."
  docker stop "$CONTAINER" >/dev/null
fi

# 2) 恢复前自动留底当前库
if [ -f "$DATA_DIR/license.db" ]; then
  STAMP="$(date +%Y%m%d_%H%M%S)"
  cp "$DATA_DIR/license.db" "$DATA_DIR/license.db.pre-restore.$STAMP"
  echo "[restore] 已留底当前库：license.db.pre-restore.$STAMP"
fi

# 3) 覆盖数据库并清理 WAL/SHM（避免旧 WAL 数据污染）
mkdir -p "$DATA_DIR"
cp "$BACKUP_FILE" "$DATA_DIR/license.db"
rm -f "$DATA_DIR/license.db-wal" "$DATA_DIR/license.db-shm"

echo "[restore] 恢复完成：$BACKUP_FILE -> $DATA_DIR/license.db"

# 4) 重启容器
if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "[restore] 启动容器 $CONTAINER ..."
  docker start "$CONTAINER" >/dev/null
fi

echo "[restore] 请验证：curl http://127.0.0.1:3002/health"
echo "[restore] 期望返回：{\"success\":true,\"status\":\"ok\"}"

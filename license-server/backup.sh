#!/usr/bin/env bash
#
# 栖缘社 license-server 在线备份脚本
#
# 用途：对 SQLite 数据库（license.db）做一致性在线备份，防止单点故障导致授权台账丢失。
#       可配合 crontab 定时执行，并可用 rsync/scp 做异地备份。
#
# 用法：
#   ./backup.sh [备份目录] [保留份数]
#   示例：./backup.sh ./backups 30
#
# 备份输出位置：默认 <脚本目录>/backups/license_YYYYMMDD_HHMMSS.db（保留最近 30 份）
#
# crontab 计划任务（每天 04:00）：
#   0 4 * * * cd /usr/local/src/qiyuanshe-license && bash ./backup.sh ./backups 30 >> ./backups/backup.log 2>&1
#
# 依赖：优先使用宿主机 sqlite3 命令；若没有，则回退到运行中容器内的 better-sqlite3。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="${DATA_DIR:-$SCRIPT_DIR/data}"
BACKUP_ROOT="${1:-$SCRIPT_DIR/backups}"
KEEP="${2:-30}"
CONTAINER="${CONTAINER:-qys_license}"

DB_FILE="$DATA_DIR/license.db"
if [ ! -f "$DB_FILE" ]; then
  echo "[backup] 错误：找不到数据库文件 $DB_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_ROOT"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_ROOT/license_$STAMP.db"

if command -v sqlite3 >/dev/null 2>&1; then
  echo "[backup] 使用宿主机 sqlite3 在线备份..."
  sqlite3 "$DB_FILE" ".backup '$OUT'"
elif docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "[backup] 使用容器内 better-sqlite3 在线备份..."
  docker exec "$CONTAINER" node -e "
    (async () => {
      const Database = require('better-sqlite3');
      const db = new Database('/app/data/license.db');
      await db.backup('/app/data/_backup_tmp.db');
      db.close();
    })().catch((e) => { console.error(e); process.exit(1); });
  "
  mv "$DATA_DIR/_backup_tmp.db" "$OUT"
else
  echo "[backup] 错误：宿主机无 sqlite3 命令，且容器 $CONTAINER 未运行。" >&2
  echo "[backup]       请安装 sqlite3（apt/yum install sqlite3）或先启动容器。" >&2
  exit 1
fi

if [ ! -s "$OUT" ]; then
  echo "[backup] 错误：备份文件为空，备份失败。" >&2
  exit 1
fi

echo "[backup] 完成：$OUT ($(du -h "$OUT" | cut -f1))"

# 清理旧备份，只保留最近 KEEP 份
if [ "${KEEP}" -gt 0 ] 2>/dev/null; then
  ls -1t "$BACKUP_ROOT"/license_*.db 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r f; do
    rm -f "$f"
    echo "[backup] 已清理旧备份：$f"
  done
fi

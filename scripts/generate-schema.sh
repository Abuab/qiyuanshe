#!/bin/bash
# =============================================
# 栖缘社 — 从 TypeORM Entity 生成完整建表结构
# =============================================
# 目的：init.sql / migrations 只覆盖部分表，且手写建表已落后于 Entity 定义。
#       本脚本临时起一个空 MySQL，用 TypeORM synchronize 按当前实体建全表，
#       再 mysqldump --no-data 导出为权威 schema（docker/mysql/schema.sql）。
#
# 用法：
#   bash scripts/generate-schema.sh
#
# 前提：
#   - 已安装 Docker
#   - backend 目录已执行过 npm install（有 node_modules）
#
# 输出：
#   docker/mysql/schema.sql  （DROP TABLE IF EXISTS + CREATE TABLE，完整权威建表）
#
# 从零部署时由 docker-compose 以 01-schema.sql 的顺序先执行，
# 随后 02-seed.sql（即原 init.sql 的种子数据）再执行，保证所有表 + 种子数据齐全。
# =============================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
OUTPUT="$PROJECT_DIR/docker/mysql/schema.sql"

# 临时 MySQL 容器参数（与生产 qys_mysql 完全隔离）
TEMP_CONTAINER="qiyuanshe_schema_gen"
TEMP_PORT="${SCHEMA_GEN_PORT:-13306}"
TEMP_DB="qiyuanshe_schema"
TEMP_ROOT_PASS="tmp_schema_123"

# 目标数据库名（必须与 docker-compose 的 MYSQL_DATABASE 一致）
TARGET_DB="qys_match"
if [ -f "$PROJECT_DIR/.env" ]; then
  _db="$(grep -E '^MYSQL_DATABASE=' "$PROJECT_DIR/.env" | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)"
  [ -n "$_db" ] && TARGET_DB="$_db"
fi

log_info "目标数据库: ${TARGET_DB}"
log_info "输出文件:   ${OUTPUT}"

# 1. 依赖检查
if ! command -v docker &>/dev/null; then
  log_error "未检测到 Docker，请先安装 Docker"
  exit 1
fi
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  log_error "backend/node_modules 不存在，请先在 backend 目录执行: npm install"
  exit 1
fi

# 2. 启动临时 MySQL
log_info "启动临时 MySQL 容器 (${TEMP_CONTAINER}:${TEMP_PORT}) ..."
docker rm -f "$TEMP_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$TEMP_CONTAINER" \
  -e MYSQL_ROOT_PASSWORD="$TEMP_ROOT_PASS" \
  -e MYSQL_DATABASE="$TEMP_DB" \
  -p "127.0.0.1:${TEMP_PORT}:3306" \
  mysql:8.0 \
  --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci \
  >/dev/null

cleanup() {
  log_info "清理临时容器 ${TEMP_CONTAINER} ..."
  docker rm -f "$TEMP_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# 3. 等待 MySQL 就绪
log_info "等待临时 MySQL 就绪 ..."
ready=0
for i in $(seq 1 60); do
  if docker exec "$TEMP_CONTAINER" mysqladmin ping -h127.0.0.1 -uroot -p"$TEMP_ROOT_PASS" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  log_error "临时 MySQL 启动超时"
  exit 1
fi
log_success "临时 MySQL 已就绪"

# 4. 用 TypeORM synchronize 按 Entity 建全表
log_info "运行 TypeORM synchronize 生成表结构 ..."
(
  cd "$BACKEND_DIR"
  DB_HOST=127.0.0.1 DB_PORT="$TEMP_PORT" DB_USERNAME=root \
  DB_PASSWORD="$TEMP_ROOT_PASS" DB_DATABASE="$TEMP_DB" \
  npx ts-node src/scripts/generate-schema.ts
)

# 5. 导出建表 SQL（仅结构，不含数据）
log_info "导出建表 SQL ..."
docker exec "$TEMP_CONTAINER" sh -c \
  "mysqldump -uroot -p'$TEMP_ROOT_PASS' --no-data --skip-add-locks --skip-comments --skip-disable-keys --no-tablespaces --routines --triggers $TEMP_DB" \
  > "$OUTPUT.raw"

# 6. 生成权威 schema 文件（含头部说明 + USE 目标库）
# 若 schema.sql 是目录（docker compose 曾因文件缺失自动创建同名目录），先删除
if [ -d "$OUTPUT" ]; then
  log_warning "检测到 ${OUTPUT} 是目录（Docker 自动创建），删除后重新生成为文件"
  rm -rf "$OUTPUT"
fi
{
  echo "-- ============================================="
  echo "-- 栖缘社完整建表结构（由 scripts/generate-schema.sh 自动生成）"
  echo "-- 数据源: TypeORM Entity（backend/src/**/entities）"
  echo "-- 生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "-- 目标数据库: ${TARGET_DB}"
  echo "-- 从零部署时由 docker-entrypoint-initdb.d/01-schema.sql 执行"
  echo "-- ============================================="
  echo ""
  echo "SET NAMES utf8mb4;"
  echo "USE \`${TARGET_DB}\`;"
  echo ""
  cat "$OUTPUT.raw"
} > "$OUTPUT"
rm -f "$OUTPUT.raw"

TABLE_COUNT="$(grep -c '^CREATE TABLE' "$OUTPUT" || true)"
log_success "已生成 ${OUTPUT}，共 ${TABLE_COUNT} 张表"

echo ""
log_info "后续步骤："
echo "  1. 审查生成结果:  git diff docker/mysql/schema.sql"
echo "  2. 提交到 git:     git add docker/mysql/schema.sql && git commit"
echo "  3. 从零部署时，docker compose up 会按 01-schema.sql → 02-seed.sql 顺序初始化数据库"

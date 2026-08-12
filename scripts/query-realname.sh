#!/bin/bash
# =============================================================================
# 实名认证数据查询运维脚本
# =============================================================================
# 用途：查询 real_name_identities 和 user_auths 表中的实名认证数据
# 适用：排查多用户使用同一实名认证、核对用户身份信息等场景
#
# 数据存储说明：
#   - real_name_identities 表：E 证通认证通过后写入，为主表
#     - idCardHash 是身份证号 SHA-256 哈希（去重用）
#     - realName / idCard 已使用 AES-256-GCM 加密存储（数据库泄露也无法还原明文）
#     - 使用 scripts/decrypt-identity.js 解密（依赖 IDENTITY_ENCRYPTION_KEY）
#     - status: 0=有效, 1=已注销
#   - user_auths 表：旧版认证数据，authType='realname' 时 authData JSON
#     包含 {realName, idCard}（新数据也已加密存储）
#     - status: 0=待审核, 1=通过, 2=驳回
#
# 使用方式：
#   bash scripts/query-realname.sh <命令> [参数]
#
# 可用命令：
#   user <用户ID>        查询指定用户的实名信息（自动解密）
#   idcard <身份证号>     查询某一身份证号被哪几个用户使用（按哈希匹配）
#   duplicate            统计被多个用户使用的身份证号（按哈希聚合）
#   legacy               列出 user_auths 旧表中的实名数据（自动解密）
#   all                  列出所有已实名用户（自动解密）
# =============================================================================

set -euo pipefail

# ----- 项目根目录 & 解密工具 -----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DECRYPT_SCRIPT="$SCRIPT_DIR/decrypt-identity.js"
if [ ! -f "$DECRYPT_SCRIPT" ]; then
    echo "[ERROR] 解密脚本未找到: $DECRYPT_SCRIPT" >&2
    exit 1
fi

# ----- MySQL 连接配置（通过 Docker 容器） -----
# 使用 MYSQL_PWD 环境变量传递密码，避免命令行密码触发 "Using a password" warning 污染输出
MYSQL_CMD="docker exec -e MYSQL_PWD=lingtong_root_2024_secure -i lingtong_mysql mysql -uroot lingtong_match"

# ----- 辅助函数：执行 SQL（格式化表格输出） -----
run_sql() {
    local sql="$1"
    echo "$sql" | $MYSQL_CMD 2>&1
}

# ----- 辅助函数：执行 SQL（无表头、制表符分隔，用于后处理） -----
run_sql_raw() {
    local sql="$1"
    echo "$sql" | $MYSQL_CMD -B --skip-column-names 2>&1
}

# ----- 辅助函数：解密单个字段值 -----
try_decrypt() {
    local val="$1"
    if [ -z "$val" ]; then
        echo "(空)"
        return
    fi
    # 启发式判断：短字符串很可能是明文（中文姓名 2-4 字），直接返回
    if [ "${#val}" -lt 30 ]; then
        echo "$val"
        return
    fi
    # 仅包含中文/数字/字母X 的是身份证号明文
    if [[ "$val" =~ ^[A-Za-z0-9Xx*·[:space:]]+$ ]] && [ "${#val}" -lt 30 ]; then
        echo "$val"
        return
    fi
    # 调用 Node.js 解密
    local result
    result=$(node "$DECRYPT_SCRIPT" "$val" 2>/dev/null) || true
    if [ -n "$result" ]; then
        echo "$result"
    else
        echo "$val"
    fi
}

# ----- 命令：查询指定用户的实名信息 -----
# 参数：用户 ID
cmd_user() {
    local user_id="${1:-}"
    if [ -z "$user_id" ]; then
        echo "用法: bash $0 user <用户ID>"
        echo "示例: bash $0 user 564088"
        exit 1
    fi

    echo "========== 用户 $user_id 的实名信息 =========="
    echo ""

    # 主表查询（raw 格式，逐行解密 realName / idCard）
    echo "--- real_name_identities（主表）---"
    local raw
    raw=$(run_sql_raw "
        SELECT u.id,
               u.nickname,
               u.isDeleted,
               rni.realName,
               rni.idCard,
               rni.status,
               rni.verifiedAt
          FROM real_name_identities rni
          JOIN users u ON u.id = rni.userId
         WHERE u.id = $user_id;
    ")
    if [ -z "$raw" ]; then
        echo "  (无记录)"
    else
        while IFS=$'\t' read -r uid nickname is_deleted enc_name enc_idcard status verified_at; do
            local dec_name dec_idcard
            dec_name=$(try_decrypt "$enc_name")
            dec_idcard=$(try_decrypt "$enc_idcard")
            printf "  用户ID: %s\n  昵称: %s\n  已注销: %s\n  真实姓名: %s\n  身份证号: %s\n  认证状态: %s\n  认证时间: %s\n\n" \
                "$uid" "$nickname" "$is_deleted" "$dec_name" "$dec_idcard" "$status" "$verified_at"
        done <<< "$raw"
    fi

    # 旧表查询
    echo "--- user_auths（旧表兜底）---"
    run_sql "
        SELECT u.id         AS '用户ID',
               u.nickname   AS '昵称',
               ua.authData  AS '认证数据(JSON)',
               ua.status    AS '审核状态(1=通过)',
               ua.createdAt AS '提交时间'
          FROM user_auths ua
          JOIN users u ON u.id = ua.userId
         WHERE ua.authType = 'realname'
           AND u.id = $user_id;
    "
    echo ""
    echo "提示: authData 中 realName/idCard 为加密存储，可手动解密："
    echo "  node $DECRYPT_SCRIPT <authData 中的密文>"
}

# ----- 命令：查询同一身份证号被哪几个用户使用 -----
# 参数：身份证号（18 位明文）
# 说明：通过 SHA-256 哈希匹配主表（不受加密影响），再兜底查询 user_auths 旧表
cmd_idcard() {
    local id_card="${1:-}"
    if [ -z "$id_card" ]; then
        echo "用法: bash $0 idcard <18位身份证号>"
        echo "示例: bash $0 idcard 110101199001011234"
        exit 1
    fi

    echo "========== 身份证号 $id_card 关联的用户 =========="
    echo ""

    # 主表：通过 idCardHash 匹配（hash 不受加密影响）
    echo "--- real_name_identities（主表，按哈希匹配）---"
    run_sql "
        SELECT u.id            AS '用户ID',
               u.nickname      AS '昵称',
               u.isDeleted     AS '已注销',
               u.status        AS '账号状态',
               rni.status      AS '认证状态(0=有效/1=注销)',
               rni.verifiedAt  AS '认证时间'
          FROM real_name_identities rni
          JOIN users u ON u.id = rni.userId
         WHERE rni.idCardHash = SHA2('$id_card', 256);
    "

    # 兜底：user_auths 表中明文匹配（仅对未加密旧数据有效）
    echo ""
    echo "--- user_auths（旧表兜底，仅匹配未加密的旧数据）---"
    run_sql "
        SELECT u.id             AS '用户ID',
               u.nickname       AS '昵称',
               u.isDeleted      AS '已注销',
               ua.status        AS '审核状态'
          FROM user_auths ua
          JOIN users u ON u.id = ua.userId
         WHERE ua.authType = 'realname'
           AND ua.status = 1
           AND JSON_UNQUOTE(JSON_EXTRACT(ua.authData, '$.idCard')) = '$id_card';
    "
    echo ""
    echo "提示: 新数据 idCard 已加密，user_auths 兜底查询可能无结果。主表按 idCardHash 匹配不受影响。"
}

# ----- 命令：统计被多个用户使用的身份证号 -----
# 说明：按 idCardHash 聚合（不受加密影响）
cmd_duplicate() {
    echo "========== 被多个用户使用的身份证号（活跃用户）=========="
    echo ""
    echo "说明：按 idCardHash 聚合，只统计 isDeleted=0 的活跃账号"
    echo ""

    run_sql "
        SELECT rni.idCardHash                                  AS '身份证号哈希',
               COUNT(*)                                        AS '绑定用户数',
               GROUP_CONCAT(u.id ORDER BY u.id SEPARATOR ',')  AS '用户ID列表',
               GROUP_CONCAT(u.nickname ORDER BY u.id SEPARATOR ',') AS '用户昵称列表'
          FROM real_name_identities rni
          JOIN users u ON u.id = rni.userId
         WHERE u.isDeleted = 0
           AND rni.status = 0
         GROUP BY rni.idCardHash
        HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC;
    "

    echo ""
    echo "--- 同时检查 user_auths 旧表 ---"
    run_sql "
        SELECT JSON_UNQUOTE(JSON_EXTRACT(ua.authData, '$.idCard')) AS '身份证号',
               COUNT(*)                                            AS '绑定用户数',
               GROUP_CONCAT(ua.userId ORDER BY ua.userId SEPARATOR ',') AS '用户ID列表'
          FROM user_auths ua
          JOIN users u ON u.id = ua.userId
         WHERE ua.authType = 'realname'
           AND ua.status = 1
           AND u.isDeleted = 0
         GROUP BY JSON_UNQUOTE(JSON_EXTRACT(ua.authData, '$.idCard'))
        HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC;
    "
    echo ""
    echo "提示: 新数据 idCard 已加密，user_auths 旧表统计可能不全。主表按 idCardHash 聚合不受影响。"
}

# ----- 命令：列出 user_auths 旧表中的实名数据 -----
cmd_legacy() {
    echo "========== user_auths 旧表中所有已通过的实名认证记录 =========="
    echo ""
    echo "说明：这些是在 real_name_identities 表创建之前通过认证的数据"
    echo "      authData 中 realName/idCard 若为密文，会尝试自动解密"
    echo ""

    run_sql "
        SELECT u.id                                                              AS '用户ID',
               u.nickname                                                        AS '昵称',
               u.isDeleted                                                       AS '已注销',
               JSON_UNQUOTE(JSON_EXTRACT(ua.authData, '$.realName'))             AS '真实姓名(加密)',
               JSON_UNQUOTE(JSON_EXTRACT(ua.authData, '$.idCard'))               AS '身份证号(加密)',
               ua.status                                                         AS '审核状态',
               ua.createdAt                                                      AS '提交时间'
          FROM user_auths ua
          JOIN users u ON u.id = ua.userId
         WHERE ua.authType = 'realname'
           AND ua.status = 1
         ORDER BY ua.createdAt DESC
         LIMIT 100;
    "
}

# ----- 命令：列出所有已实名用户 -----
cmd_all() {
    echo "========== 所有已实名用户（活跃账号）=========="
    echo ""

    local raw
    raw=$(run_sql_raw "
        SELECT u.id,
               u.nickname,
               rni.realName,
               rni.idCard,
               rni.verifiedAt
          FROM real_name_identities rni
          JOIN users u ON u.id = rni.userId
         WHERE u.isDeleted = 0
           AND rni.status = 0
         ORDER BY rni.verifiedAt DESC
         LIMIT 200;
    ")
    if [ -z "$raw" ]; then
        echo "  (无记录)"
    else
        printf "%-8s %-16s %-10s %-20s %s\n" "用户ID" "昵称" "真实姓名" "身份证号" "认证时间"
        printf "%-8s %-16s %-10s %-20s %s\n" "------" "----" "--------" "--------" "--------"
        while IFS=$'\t' read -r uid nickname enc_name enc_idcard verified_at; do
            local dec_name dec_idcard
            dec_name=$(try_decrypt "$enc_name")
            dec_idcard=$(try_decrypt "$enc_idcard")
            printf "%-8s %-16s %-10s %-20s %s\n" "$uid" "$nickname" "$dec_name" "$dec_idcard" "$verified_at"
        done <<< "$raw"
    fi
    echo ""
    echo "提示: realName / idCard 通过 Node.js 解密输出（依赖 IDENTITY_ENCRYPTION_KEY）"
}

# =============================================================================
# 主入口
# =============================================================================
case "${1:-}" in
    user)       cmd_user "${2:-}" ;;
    idcard)     cmd_idcard "${2:-}" ;;
    duplicate)  cmd_duplicate ;;
    legacy)     cmd_legacy ;;
    all)        cmd_all ;;
    *)
        echo "实名认证数据查询运维脚本"
        echo ""
        echo "用法: bash $0 <命令> [参数]"
        echo ""
        echo "命令:"
        echo "  user <用户ID>        查询指定用户的实名信息（自动解密）"
        echo "  idcard <身份证号>     查询某一身份证号被哪几个用户使用（按哈希匹配）"
        echo "  duplicate            统计被多个用户使用的身份证号（按哈希聚合）"
        echo "  legacy               列出 user_auths 旧表中的实名数据"
        echo "  all                  列出所有已实名用户（自动解密）"
        echo ""
        echo "示例:"
        echo "  bash $0 user 564088"
        echo "  bash $0 idcard 110101199001011234"
        echo "  bash $0 duplicate"
        echo ""
        echo "手动解密: node $DECRYPT_SCRIPT <密文>"
        ;;
esac

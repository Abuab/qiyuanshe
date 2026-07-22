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
#     - idCard 存储明文身份证号（建议生产环境加密）
#     - status: 0=有效, 1=已注销
#   - user_auths 表：旧版认证数据，authType='realname' 时 authData JSON 包含 {realName, idCard}
#     - status: 0=待审核, 1=通过, 2=驳回
#
# 使用方式：
#   bash scripts/query-realname.sh <命令> [参数]
#
# 可用命令：
#   user <用户ID>        查询指定用户的实名信息
#   idcard <身份证号>     查询某一身份证号被哪几个用户使用
#   duplicate            统计被多个用户使用的身份证号（排查重复认证）
#   legacy               列出 user_auths 旧表中的实名数据
#   all                  列出所有已实名用户
# =============================================================================

set -euo pipefail

# ----- MySQL 连接配置（通过 Docker 容器） -----
MYSQL_CMD="docker exec -i lingtong_mysql mysql -uroot -plingtong_root_2024_secure lingtong_match"

# ----- 辅助函数：执行 SQL 并格式化输出 -----
run_sql() {
    local sql="$1"
    echo "$sql" | $MYSQL_CMD 2>&1
}

# ----- 命令：查询指定用户的实名信息 -----
# 参数：用户 ID
# 输出：用户昵称、真实姓名、身份证号、记录状态、认证时间
cmd_user() {
    local user_id="${1:-}"
    if [ -z "$user_id" ]; then
        echo "用法: bash $0 user <用户ID>"
        echo "示例: bash $0 user 564088"
        exit 1
    fi

    echo "========== 用户 $user_id 的实名信息 =========="
    echo ""

    # 主表查询：real_name_identities
    echo "--- real_name_identities（主表）---"
    run_sql "
        SELECT u.id            AS '用户ID',
               u.nickname      AS '昵称',
               u.isDeleted     AS '已注销',
               rni.realName    AS '真实姓名',
               rni.idCard      AS '身份证号',
               rni.status      AS '认证状态(0=有效/1=注销)',
               rni.verifiedAt  AS '认证时间'
          FROM real_name_identities rni
          JOIN users u ON u.id = rni.userId
         WHERE u.id = $user_id;
    "
    echo ""

    # 旧表查询：user_auths
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
}

# ----- 命令：查询同一身份证号被哪几个用户使用 -----
# 参数：身份证号（18 位明文）
# 说明：通过 SHA-256 哈希匹配主表，再兜底查询 user_auths 旧表
cmd_idcard() {
    local id_card="${1:-}"
    if [ -z "$id_card" ]; then
        echo "用法: bash $0 idcard <18位身份证号>"
        echo "示例: bash $0 idcard 110101199001011234"
        exit 1
    fi

    echo "========== 身份证号 $id_card 关联的用户 =========="
    echo ""

    # 主表：通过 idCardHash 匹配
    echo "--- real_name_identities（主表，按哈希匹配）---"
    run_sql "
        SELECT u.id            AS '用户ID',
               u.nickname      AS '昵称',
               u.isDeleted     AS '已注销',
               u.status        AS '账号状态',
               rni.realName    AS '真实姓名',
               rni.status      AS '认证状态(0=有效/1=注销)',
               rni.verifiedAt  AS '认证时间'
          FROM real_name_identities rni
          JOIN users u ON u.id = rni.userId
         WHERE rni.idCardHash = SHA2('$id_card', 256);
    "

    # 兜底：user_auths 表中明文匹配（旧数据可能未写入 real_name_identities）
    echo ""
    echo "--- user_auths（旧表兜底，按身份证号明文匹配）---"
    run_sql "
        SELECT u.id             AS '用户ID',
               u.nickname       AS '昵称',
               u.isDeleted      AS '已注销',
               ua.authData      AS '认证数据(JSON)',
               ua.status        AS '审核状态'
          FROM user_auths ua
          JOIN users u ON u.id = ua.userId
         WHERE ua.authType = 'realname'
           AND ua.status = 1
           AND JSON_UNQUOTE(JSON_EXTRACT(ua.authData, '$.idCard')) = '$id_card';
    "
}

# ----- 命令：统计被多个用户使用的身份证号 -----
# 说明：只统计 isDeleted=0 的活跃用户，用于排查多账号共用同一实名认证
cmd_duplicate() {
    echo "========== 被多个用户使用的身份证号（活跃用户）=========="
    echo ""
    echo "说明：只统计 isDeleted=0 的活跃账号，status=0 的有效认证记录"
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
    echo "--- 同时检查 user_auths 旧表中是否有同一身份证号对应多用户 ---"
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
}

# ----- 命令：列出 user_auths 旧表中的实名数据 -----
cmd_legacy() {
    echo "========== user_auths 旧表中所有已通过的实名认证记录 =========="
    echo ""
    echo "说明：这些是在 real_name_identities 表创建之前通过认证的旧数据"
    echo ""

    run_sql "
        SELECT u.id                                                              AS '用户ID',
               u.nickname                                                        AS '昵称',
               u.isDeleted                                                       AS '已注销',
               JSON_UNQUOTE(JSON_EXTRACT(ua.authData, '$.realName'))             AS '真实姓名',
               JSON_UNQUOTE(JSON_EXTRACT(ua.authData, '$.idCard'))               AS '身份证号',
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

    run_sql "
        SELECT u.id            AS '用户ID',
               u.nickname      AS '昵称',
               rni.realName    AS '真实姓名',
               rni.idCard      AS '身份证号',
               rni.verifiedAt  AS '认证时间'
          FROM real_name_identities rni
          JOIN users u ON u.id = rni.userId
         WHERE u.isDeleted = 0
           AND rni.status = 0
         ORDER BY rni.verifiedAt DESC
         LIMIT 200;
    "
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
        echo "  user <用户ID>        查询指定用户的实名信息"
        echo "  idcard <身份证号>     查询某一身份证号被哪几个用户使用"
        echo "  duplicate            统计被多个用户使用的身份证号"
        echo "  legacy               列出 user_auths 旧表中的实名数据"
        echo "  all                  列出所有已实名用户"
        echo ""
        echo "示例:"
        echo "  bash $0 user 564088"
        echo "  bash $0 idcard 110101199001011234"
        echo "  bash $0 duplicate"
        ;;
esac

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
栖缘社 License 签发脚本（本地工具，仅供授权方使用）

用法：python3 generate-license.py [私钥路径]
默认私钥路径：./license_private.pem

说明：
- 使用 RSA 私钥对 payload 做 SHA256 签名，输出 Base64 License Key 发给客户
- 公钥已硬编码在后端 backend/src/license/license.service.ts 中
- 私钥绝不可提交到代码仓库
- 纯离线模式：本地验签 + 机器指纹绑定（可选），无远程吊销与激活计数
- 依赖：pip install cryptography
"""
import sys
import os
import json
import base64
from datetime import datetime, timedelta, timezone

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
except ImportError:
    print('缺少依赖 cryptography，请先安装：pip install cryptography')
    sys.exit(1)

PRIVATE_KEY_PATH = sys.argv[1] if len(sys.argv) > 1 else './license_private.pem'

# 与后端 ALL_LICENSE_FEATURES 保持一致
ALL_FEATURES = [
    'user_browse',
    'like',
    'contact_apply',
    'matchmaker',
    'ai_match',
    'ai_quiz',
    'ai_chat',
    'chat',
    'dynamic_post',
    'answer',
    'vip',
    'visitor_log',
    'personality_test',
    'realname_auth',
]


def now_iso_ms():
    """返回与 JS new Date().toISOString() 等价的毫秒级 UTC 时间字符串"""
    now = datetime.now(timezone.utc)
    return now.strftime('%Y-%m-%dT%H:%M:%S.') + '%03dZ' % (now.microsecond // 1000)


def main():
    if not os.path.exists(PRIVATE_KEY_PATH):
        print('未找到私钥文件：%s' % PRIVATE_KEY_PATH)
        print('用法：python3 generate-license.py <私钥路径>')
        sys.exit(1)

    with open(PRIVATE_KEY_PATH, 'rb') as f:
        private_key = serialization.load_pem_private_key(f.read(), password=None)

    customer_id = input('客户ID (如 C20260901001): ').strip()
    if not customer_id:
        print('客户ID不能为空')
        sys.exit(1)

    customer = input('客户名称: ').strip()
    if not customer:
        print('客户名称不能为空')
        sys.exit(1)

    domain = input('绑定域名 (* 表示不限): ').strip() or '*'

    machine_id = input('绑定机器指纹 (可选，防复制；客户在管理后台「系统授权」页查看并发送): ').strip()

    days = input('授权天数 (整数，如 365；直接回车则改为填写过期时间): ').strip()
    if days:
        try:
            n = int(days)
        except ValueError:
            print('授权天数应为正整数')
            sys.exit(1)
        if n <= 0:
            print('授权天数应为正整数')
            sys.exit(1)
        expires_at = (datetime.now() + timedelta(days=n)).strftime('%Y-%m-%d')
    else:
        expires_at = input('过期时间 (YYYY-MM-DD): ').strip()
        try:
            datetime.strptime(expires_at, '%Y-%m-%d')
        except ValueError:
            print('过期时间格式应为 YYYY-MM-DD')
            sys.exit(1)

    status = input('授权状态 (valid/grace_period/expired, 默认 valid): ').strip() or 'valid'
    if status not in ('valid', 'grace_period', 'expired'):
        print('授权状态只能是 valid / grace_period / expired')
        sys.exit(1)

    payload = {
        'customer': customer,
        'customerId': customer_id,
        'domain': domain,
        'status': status,
        'expiresAt': expires_at + 'T23:59:59+08:00',
        'features': ALL_FEATURES,
        'issuedAt': now_iso_ms(),
    }
    if machine_id:
        payload['machineId'] = machine_id

    # 关键：ensure_ascii=False 保证中文不转义；separators 保证紧凑格式，与后端 JSON.stringify 逐字节一致
    payload_str = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))

    signature_bytes = private_key.sign(
        payload_str.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    signature_b64 = base64.b64encode(signature_bytes).decode('utf-8')

    outer = json.dumps(
        {'payload': payload, 'signature': signature_b64},
        ensure_ascii=False,
        separators=(',', ':'),
    )
    license_key = base64.b64encode(outer.encode('utf-8')).decode('utf-8')

    print('\n========== License Key（发给客户） ==========')
    print(license_key)
    print('\n========== 授权信息 ==========')
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    print('\n========== 机器指纹绑定 ==========')
    print('已绑定机器指纹: %s' % machine_id if machine_id else '未绑定机器指纹（该 License 可复制到任意服务器）')


if __name__ == '__main__':
    main()

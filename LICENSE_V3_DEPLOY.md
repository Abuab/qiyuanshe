# License V3（远程可控混合授权）部署说明

> 目标：把「本地 RSA 验签 + 远程许可证服务器心跳吊销」这套新授权系统部署到生产环境。

---

## 一、当前状态与重要风险

经排查，生产环境目前运行的仍是**旧版配置式授权**（读 `system_configs` 表的 `license.config`，fail-open），
新版的 RSA 授权 + 远程吊销代码**尚未部署**，`system_licenses` 表也不存在。

部署新代码后会发生以下变化，请务必先理解：

1. **授权策略从 fail-open 变为 fail-closed**：无授权记录 / 验签失败 / 数据库异常时，一律判定为 `unauthorized`，小程序写功能与管理后台（除登录、验证码、MFA、`/admin/license` 激活页外）会被拦截。
2. 也就是说，**新代码部署后、激活 License Key 之前，线上系统会处于锁定状态**，需要尽快在管理后台「系统授权」页激活。
3. 激活需要一张有效的 RSA License Key，它必须由**与后端硬编码公钥配对的私钥**签发。

---

## 二、前置条件

- 本地能 `ssh sh-th`（150.158.130.152:6666）
- 本地 git 能推送 `origin`（github）与 `gitee`
- 后端代码在服务器路径 `/usr/local/src/qiyuanshe/`
- 数据库：`qys_match`（容器 `qys_mysql`）

---

## 三、RSA 密钥与 License 签发（关键，先做）

### 1. 确认/生成密钥对

后端硬编码了公钥（`backend/src/license/license.service.ts` 的 `LICENSE_PUBLIC_KEY`），签发时必须用配对私钥。

- 若你已有配对私钥：直接跳到「签发 License」。
- 若私钥已丢失（当前本机未找到 `~/license-keys/license_private.pem`），需要**重新生成密钥对并同步更新后端公钥**：

```bash
mkdir -p ~/license-keys && cd ~/license-keys
openssl genrsa -out license_private.pem 2048
openssl rsa -in license_private.pem -pubout -out license_public.pem
```

然后用 `license_public.pem` 的内容替换 `backend/src/license/license.service.ts` 中 `LICENSE_PUBLIC_KEY` 的 base64 段落（保留 `-----BEGIN/END PUBLIC KEY-----`）。

> ⚠️ 私钥 `license_private.pem` 绝不能提交到仓库或上传服务器。

### 2. 签发 License Key

```bash
cd /Users/kevin/Documents/trae_projects/qiyuanshe-match
node generate-license.js ~/license-keys/license_private.pem
```

按提示输入：客户 ID、客户名称、绑定域名、过期时间、是否绑定机器指纹。

脚本会输出：
- **License Key**（发给客户 / 用于本机激活）
- **客户 ID 与授权签名**（用于在许可证服务器预录入，实现远程吊销）

> 若本机部署不绑定机器指纹，直接在「绑定机器指纹?」处回车（默认 n）即可。

---

## 四、数据库迁移

新代码在 `backend/migrations/1757000000000-CreateSystemLicensesTable.ts` 中新增了 `system_licenses` 表。

迁移会在后端容器启动时**自动执行**（见 `backend/docker-entrypoint.sh` 的 `migration:run`），无需手动操作。
如需手动验证/执行，可在服务器上直连 MySQL：

```bash
docker exec -it qys_mysql mysql -uroot -p'ead7be5d866fa16544c53143754f7e08271f23e9d08768a8' qys_match \
  -e "SHOW CREATE TABLE system_licenses\G"
```

---

## 五、部署后端（客户端）

```bash
# 1) 本地提交并推送（github + gitee）
cd /Users/kevin/Documents/trae_projects/qiyuanshe-match
git add -A
git commit -m "feat: 升级 License 为 RSA 验签 + 远程吊销混合授权（V3）"
git push origin main && git push gitee main

# 2) 服务器拉取并重建（迁移会自动执行）
ssh sh-th
cd /usr/local/src/qiyuanshe/
git pull
docker compose down && docker compose up -d --build
sleep 3 && docker compose ps
```

重建完成后，立即登录管理后台「系统授权」页，粘贴签发的 License Key 激活，避免系统长时间处于锁定状态。

---

## 六、部署许可证服务器（license-server）

独立服务，代码位于仓库 `license-server/` 子目录。建议部署到服务器 `/usr/local/src/qiyuanshe-license/`。

```bash
# 在服务器上
mkdir -p /usr/local/src/qiyuanshe-license
# 把 license-server/ 目录内容拷贝过去（或从仓库 git 拉取后 cp）
cp -r /usr/local/src/qiyuanshe/license-server/. /usr/local/src/qiyuanshe-license/

cd /usr/local/src/qiyuanshe-license
# 设置管理面板密钥（务必改成强随机值）
export ADMIN_KEY='请改成强随机值'
docker compose up -d --build
docker compose ps
```

启动后，管理面板在 `http://127.0.0.1:3002/`（通过 nginx 反代对外）。

### nginx 反代（在 qys_nginx 配置中追加）

```nginx
server {
    listen 443 ssl;
    server_name license.你的域名;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 预录入授权（用于远程吊销）

登录许可证服务器管理面板，用「新增授权」表单录入签发脚本输出的：
- 客户 ID
- 授权签名（licenseSignature）
- 过期时间（可选，与授权码一致）

---

## 七、配置客户端心跳

在后端 `.env` 中新增（可选，不配置则纯离线运行）：

```env
LICENSE_SERVER_URL=https://license.你的域名/api/verify
APP_DOMAIN=你的域名
```

客户端每天凌晨 3 点向许可证服务器心跳；吊销后 7 天宽限期，之后锁定。

---

## 八、验证清单

1. 后端容器健康：`docker compose ps` 全部 `healthy`
2. `system_licenses` 表已创建
3. 管理后台「系统授权」页显示「已授权 / 正常」，客户 ID、远程状态正确
4. 小程序写功能正常（未被误锁）
5. 许可证服务器 `POST /api/verify` 返回 `{ valid: true, status: "valid" }`

---

## 九、回滚

若激活失败或出现异常：

```bash
ssh sh-th
cd /usr/local/src/qiyuanshe/
git log --oneline -3          # 找到上一个正常提交
git checkout <上一步提交hash>
docker compose up -d --build
```

> 回滚后回到旧版 fail-open 配置式授权，系统恢复可用。

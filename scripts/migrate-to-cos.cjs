#!/usr/bin/env node
/**
 * 本地静态资源迁移到腾讯云 COS 的一次性脚本
 *
 * 用法：
 *   node scripts/migrate-to-cos.cjs
 *
 * 功能：
 *   - 扫描 backend/.env 中 UPLOAD_DIR 下的所有文件（递归）
 *   - 保持相对路径作为 COS Key 上传（如 /mnt/agents/upload/avatar/123.jpg → Key=uploads/avatar/123.jpg）
 *   - 上传完成后输出报告：成功数、失败数、失败路径列表
 *   - 脚本幂等：同名文件覆盖上传，重复运行无影响
 *   - 本地文件迁移后永久保留，不删除
 *
 * 前置条件：
 *   - backend/.env 中 COS_ENABLED=true
 *   - COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION 均已配置
 */

const fs = require('fs')
const path = require('path')
const COS = require('cos-nodejs-sdk-v5')

// ========== 读取 .env 配置 ==========
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    console.error(`ERROR: .env file not found at ${envPath}`)
    process.exit(1)
  }
  const content = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    // 移除引号
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

// 兼容两种目录结构：项目根目录运行 scripts/migrate-to-cos.cjs 或容器内 /app/ 运行
let envFilePath = path.join(__dirname, '..', '.env')
if (!fs.existsSync(envFilePath)) {
  envFilePath = path.join(__dirname, '..', 'backend', '.env')
}

let env = {}
if (fs.existsSync(envFilePath)) {
  env = loadEnv(envFilePath)
} else {
  // 容器内运行时 .env 不挂载，变量通过 docker-compose 注入为 process.env
  console.log('INFO: .env file not found, reading from process.env (Docker container mode)')
  env = process.env
}

// ========== 校验 COS 配置 ==========
if (env.COS_ENABLED !== 'true') {
  console.error('ERROR: COS_ENABLED is not true in .env. Set COS_ENABLED=true and configure COS credentials before migrating.')
  process.exit(1)
}

const requiredKeys = ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION']
const missingKeys = requiredKeys.filter((k) => !env[k])
if (missingKeys.length > 0) {
  console.error(`ERROR: Missing required COS config keys: ${missingKeys.join(', ')}`)
  process.exit(1)
}

// ========== 初始化 COS 客户端 ==========
const cos = new COS({
  SecretId: env.COS_SECRET_ID,
  SecretKey: env.COS_SECRET_KEY,
})

const BUCKET = env.COS_BUCKET
const REGION = env.COS_REGION
const LOCAL_UPLOAD_PATH = env.UPLOAD_DIR || path.join(__dirname, '..', 'backend', 'uploads')

if (!fs.existsSync(LOCAL_UPLOAD_PATH)) {
  console.error(`ERROR: Local upload directory not found: ${LOCAL_UPLOAD_PATH}`)
  process.exit(1)
}

console.log('========================================')
console.log('  COS Migration Script')
console.log('========================================')
console.log(`  Local path: ${LOCAL_UPLOAD_PATH}`)
console.log(`  COS Bucket: ${BUCKET}`)
console.log(`  COS Region: ${REGION}`)
console.log(`  COS Key prefix: uploads/`)
console.log('========================================')
console.log('')

// ========== 递归扫描文件 ==========
function scanFiles(dir, basePath) {
  const results = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...scanFiles(fullPath, basePath))
    } else if (entry.isFile()) {
      // 跳过隐藏文件和 .gitkeep
      if (entry.name.startsWith('.')) continue
      if (entry.name === '.gitkeep') continue
      // 计算相对路径
      const relativePath = path.relative(basePath, fullPath)
      // COS Key: uploads/<relativePath>（统一使用正斜线）
      const cosKey = 'uploads/' + relativePath.split(path.sep).join('/')
      results.push({ localPath: fullPath, cosKey })
    }
  }
  return results
}

console.log('Scanning files...')
const files = scanFiles(LOCAL_UPLOAD_PATH, LOCAL_UPLOAD_PATH)
console.log(`Found ${files.length} file(s) to migrate.\n`)

if (files.length === 0) {
  console.log('No files to migrate. Exiting.')
  process.exit(0)
}

// ========== 上传文件 ==========
function uploadFile(localPath, cosKey) {
  return new Promise((resolve) => {
    const fileSize = fs.statSync(localPath).size
    cos.putObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: cosKey,
        Body: fs.createReadStream(localPath),
        ContentLength: fileSize,
      },
      (err, data) => {
        if (err) {
          resolve({ success: false, cosKey, localPath, error: err.message || String(err) })
        } else {
          resolve({ success: true, cosKey, localPath, statusCode: data.statusCode })
        }
      },
    )
  })
}

async function main() {
  let successCount = 0
  let failCount = 0
  const failedFiles = []

  // 限制并发数，避免压垮服务器
  const CONCURRENCY = 5

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map((f) => uploadFile(f.localPath, f.cosKey)))

    for (const result of results) {
      if (result.success) {
        successCount++
        console.log(`  [OK] ${result.cosKey}`)
      } else {
        failCount++
        failedFiles.push(result)
        console.error(`  [FAIL] ${result.cosKey}: ${result.error}`)
      }
    }
  }

  // ========== 输出报告 ==========
  console.log('\n========================================')
  console.log('  Migration Report')
  console.log('========================================')
  console.log(`  Total files:  ${files.length}`)
  console.log(`  Success:      ${successCount}`)
  console.log(`  Failed:       ${failCount}`)
  console.log('========================================')

  if (failedFiles.length > 0) {
    console.log('\nFailed files:')
    for (const f of failedFiles) {
      console.log(`  - ${f.cosKey} (${f.localPath}): ${f.error}`)
    }
  }

  if (failCount > 0) {
    console.log('\nWARNING: Some files failed to upload. You can re-run this script (it is idempotent) after fixing the issues.')
    process.exit(1)
  } else {
    console.log('\nAll files migrated successfully! Local files are preserved.')
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})

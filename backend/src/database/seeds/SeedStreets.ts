/**
 * 街道数据初始化脚本
 *
 * 功能：从 china-division 包的 streets 数据导入到 address_region 表
 * 数据量约 4 万条，使用批量 INSERT IGNORE 防重复
 *
 * 运行方式：
 *   cd backend
 *   npx ts-node src/database/seeds/SeedStreets.ts
 *
 * 或通过 npm script：
 *   npm run seed:streets
 */
import { DataSource } from 'typeorm'
import { AddressRegion } from '../../entities/AddressRegion'
import { join } from 'path'

// 加载 .env 文件（独立脚本不在 NestJS 上下文中运行）
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: join(__dirname, '..', '..', '..', '.env') })

async function main() {
  // 加载 china-division 街道数据
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const data = require('china-division') as {
    streets: { code: string; name: string; areaCode: string; cityCode: string; provinceCode: string }[]
  }

  if (!data.streets || data.streets.length === 0) {
    console.error('china-division 包未提供 streets 数据')
    process.exit(1)
  }

  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'qiyuanshe',
    entities: [AddressRegion],
    charset: 'utf8mb4',
    timezone: '+08:00',
  })

  await ds.initialize()
  console.log('数据库连接成功')

  const repo = ds.getRepository(AddressRegion)

  // 先检查是否已有街道数据（DB 中 level=4 为街道）
  const existingCount = await repo.count({ where: { level: 4 } })
  if (existingCount > 0) {
    console.log(`address_region 表中已有 ${existingCount} 条 level=4 街道数据，跳过导入。`)
    console.log('如需强制重新导入，请先执行：DELETE FROM address_region WHERE level = 4')
    await ds.destroy()
    process.exit(0)
  }

  const BATCH_SIZE = 500
  const streets = data.streets
  let inserted = 0
  let skipped = 0

  for (let i = 0; i < streets.length; i += BATCH_SIZE) {
    const batch = streets.slice(i, i + BATCH_SIZE)

    // 使用 INSERT IGNORE 批量插入
    const values = batch
      .map((s) => {
        const id = parseInt(s.code, 10) // 12 位完整代码作为街道 ID
        const parentId = parseInt(s.areaCode, 10) // 区县代码作为 parentId
        return `(${id}, ${parentId}, '${s.name.replace(/'/g, "\\'")}', 4, '${s.code}')`
      })
      .join(', ')

    try {
      const sql = `INSERT IGNORE INTO address_region (id, parentId, name, level, code) VALUES ${values}`
      await ds.query(sql)
      inserted += batch.length
    } catch (err) {
      // 部分重复可能仍导致批次失败，回退逐条插入
      console.warn(`批量插入失败 (offset=${i})，尝试逐条插入...`)
      let batchInserted = 0
      for (const s of batch) {
        try {
          const id = parseInt(s.code, 10)
          const parentId = parseInt(s.areaCode, 10)
          await ds.query(
            `INSERT IGNORE INTO address_region (id, parentId, name, level, code) VALUES (?, ?, ?, 4, ?)`,
            [id, parentId, s.name, s.code],
          )
          batchInserted++
        } catch {
          skipped++
        }
      }
      inserted += batchInserted
    }

    // 进度输出
    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= streets.length) {
      console.log(`进度: ${Math.min(i + BATCH_SIZE, streets.length)} / ${streets.length}`)
    }
  }

  console.log(`\n导入完成: 插入 ${inserted} 条, 跳过 ${skipped} 条`)
  await ds.destroy()
}

main().catch((err) => {
  console.error('种子脚本执行失败:', err)
  process.exit(1)
})

/**
 * 从 TypeORM Entity 生成完整建表结构（用于更新 docker/mysql/init.sql）
 *
 * 用法（在 backend 目录下，确保已 npm install）：
 *   DB_HOST=127.0.0.1 DB_PORT=13306 DB_USERNAME=root \
 *   DB_PASSWORD=tmp_root_123 DB_DATABASE=qiyuanshe_schema \
 *   npx ts-node src/scripts/generate-schema.ts
 *
 * 说明：
 *   连接到一个「空数据库」，用 TypeORM synchronize 按当前实体定义创建全部表。
 *   完成后请用 mysqldump --no-data 导出建表语句（见 scripts/generate-schema.sh）。
 */
import 'reflect-metadata'
import { DataSource } from 'typeorm'

async function main() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'qiyuanshe',
    // 覆盖全部实体目录：核心实体 + 人格测试 + 引导文案
    // 使用 {.ts,.js} 以同时兼容 ts-node（源码）与编译后（dist）两种运行方式
    entities: [
      __dirname + '/../entities/*{.ts,.js}',
      __dirname + '/../personality-test/entities/*{.ts,.js}',
      __dirname + '/../guide-copy/entities/*{.ts,.js}',
    ],
    synchronize: true,
    charset: 'utf8mb4',
    timezone: '+08:00',
  })

  await dataSource.initialize()
  await dataSource.synchronize()

  const tables = await dataSource.query('SHOW TABLES')
  console.log(`[generate-schema] 建表完成，共 ${tables.length} 张表。`)
  console.log('[generate-schema] 请继续用 mysqldump --no-data 导出建表语句。')

  await dataSource.destroy()
}

main().catch((err) => {
  console.error('[generate-schema] 失败：', err)
  process.exit(1)
})

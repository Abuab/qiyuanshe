/**
 * TypeORM DataSource 配置 — 供 CLI 运行 Migration 使用
 *
 * 用法：
 *   npx typeorm-ts-node-commonjs migration:create backend/migrations/MyMigration
 *   npx typeorm-ts-node-commonjs migration:run -d backend/src/config/data-source.ts
 *   npx typeorm-ts-node-commonjs migration:revert -d backend/src/config/data-source.ts
 *
 * 注意：此文件复用 database.ts 的配置，确保 Migration 使用的数据库连接
 * 与 NestJS 应用完全一致。
 */
import { DataSource } from 'typeorm'
import { databaseConfig as nestDbConfig } from './database'

const options = nestDbConfig() as any

// 运行环境自适应：
// - 编译后（生产）：__filename 为 dist/config/data-source.js，迁移编译在 dist/migrations
// - ts-node（开发/CLI）：__filename 为 src/config/data-source.ts，迁移源码在 backend/migrations
const isCompiled = __filename.endsWith('.js')
const migrationsGlob = isCompiled
  ? __dirname + '/../migrations/*.js'
  : __dirname + '/../../migrations/*.ts'

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: options.host || process.env.DB_HOST || 'localhost',
  port: options.port || parseInt(process.env.DB_PORT || '3306', 10),
  username: options.username || process.env.DB_USERNAME || 'root',
  password: options.password || process.env.DB_PASSWORD || '',
  database: options.database || process.env.DB_DATABASE || 'qiyuanshe',
  entities: options.entities || [__dirname + '/../entities/*{.ts,.js}'],
  migrations: [migrationsGlob],
  synchronize: false, // Migration 模式下强制关闭 synchronize
  charset: 'utf8mb4',
  timezone: '+08:00',
})

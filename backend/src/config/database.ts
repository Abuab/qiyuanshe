import { TypeOrmModuleOptions } from '@nestjs/typeorm'

export const databaseConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production'
  const dbSync = process.env.DB_SYNC === 'true'

  // 生产环境强制禁止 DB_SYNC，防止误操作删表改表
  if (isProduction && dbSync) {
    const msg = '[FATAL] 生产环境禁止设置 DB_SYNC=true！TypeORM synchronize 可能删除或修改数据库列，请立即关闭此选项后重启服务。'
    // 使用 console.error — 模块加载阶段 NestJS Logger 尚不可用，必须立即输出并中止进程
    console.error(msg)
    throw new Error(msg)
  }

  return {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'qiyuanshe',
    entities: [__dirname + '/../entities/*{.ts,.js}'],
    synchronize: dbSync && !isProduction,
    logging: false,
    autoLoadEntities: true,
    charset: 'utf8mb4',
    timezone: '+08:00',
    extra: {
      // 连接池最大连接数（建议 ≤ MySQL max_connections，本部署为 150）
      connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 20,
      // 空闲连接回收（毫秒）：避免长时间闲置占用连接
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 60000,
      // 达到连接上限时排队等待（false 则立即抛错）
      waitForConnections: true,
      // 等待队列不设上限（0 = 无限）
      queueLimit: 0,
    },
  }
}

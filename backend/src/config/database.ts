import { TypeOrmModuleOptions } from '@nestjs/typeorm'

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'qiyuanshe',
  entities: [__dirname + '/../entities/*{.ts,.js}'],
  // synchronize 仅在开发环境或 DB_SYNC=true 时启用
  synchronize: process.env.DB_SYNC === 'true',
  logging: false,
  autoLoadEntities: true,
  charset: 'utf8mb4',
  timezone: '+08:00',
})

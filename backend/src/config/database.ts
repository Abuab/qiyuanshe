import { TypeOrmModuleOptions } from '@nestjs/typeorm'

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'qiyuanshe',
  entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  autoLoadEntities: true,
  charset: 'utf8mb4',
  timezone: '+08:00',
})

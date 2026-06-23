import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as crypto from 'crypto'
import * as bcrypt from 'bcrypt'
import { AdminUser, AdminRole } from '../entities/AdminUser'

/**
 * 应用启动自动初始化管理员账号
 * - 若 admin_users 表为空，使用环境变量 ADMIN_DEFAULT_PASSWORD 或随机生成密码
 * - 随机生成的密码在启动日志中输出
 * - 若已存在管理员则跳过
 */
@Injectable()
export class AdminSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeederService.name)

  constructor(
    @InjectRepository(AdminUser)
    private readonly repo: Repository<AdminUser>,
  ) {}

  async onApplicationBootstrap() {
    try {
      const count = await this.repo.count()
      if (count > 0) return

      const password = process.env.ADMIN_DEFAULT_PASSWORD || crypto.randomBytes(12).toString('hex').slice(0, 16)
      const hashedPassword = await bcrypt.hash(password, 10)

      await this.repo.save(this.repo.create({
        username: 'admin',
        password: hashedPassword,
        nickname: '超级管理员',
        role: AdminRole.SUPER_ADMIN,
        status: 1,
      }))

      const source = process.env.ADMIN_DEFAULT_PASSWORD ? '环境变量 ADMIN_DEFAULT_PASSWORD' : '随机生成'
      this.logger.warn(`========================================`)
      this.logger.warn(`[AdminSeeder] 已创建默认超级管理员账号`)
      this.logger.warn(`  用户名: admin`)
      this.logger.warn(`  密码:   ${password}  (来源: ${source})`)
      this.logger.warn(`  请登录后立即修改密码！`)
      this.logger.warn(`========================================`)
    } catch (e) {
      this.logger.error(`[AdminSeeder] 初始化失败: ${(e as Error).message}`)
    }
  }
}

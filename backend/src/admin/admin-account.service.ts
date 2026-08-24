import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { AdminUser } from '../entities/AdminUser'
import { AdminRole } from '../shared/enums'

@Injectable()
export class AdminAccountService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly repo: Repository<AdminUser>,
  ) {}

  async validateUser(username: string, password: string): Promise<AdminUser | null> {
    const user = await this.repo.findOne({ where: { username, status: 1 } })
    if (!user) return null
    const valid = await bcrypt.compare(password, user.password)
    return valid ? user : null
  }

  async list() {
    // 仅返回子账号管理所需字段，避免泄露 password / mfaSecret / tokenVersion 等敏感字段
    return this.repo.find({
      select: ['id', 'username', 'nickname', 'role', 'status', 'isMfaEnabled', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: number) {
    return this.repo.findOne({ where: { id } })
  }

  async create(data: Partial<AdminUser>) {
    const existing = await this.repo.findOne({ where: { username: data.username } })
    if (existing) {
      throw new BadRequestException('账号已存在')
    }
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10)
    }
    return this.repo.save(this.repo.create(data))
  }

  async update(id: number, data: Partial<AdminUser>) {
    const user = await this.repo.findOne({ where: { id } })
    if (!user) {
      throw new NotFoundException('子账号不存在')
    }

    if (user.role === AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('无权操作超级管理员账号')
    }

    if (data.username && data.username !== user.username) {
      const existing = await this.repo.findOne({ where: { username: data.username } })
      if (existing) {
        throw new BadRequestException('账号已存在')
      }
    }

    const isPasswordChange = !!data.password
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10)
    }

    await this.repo.update(id, data)

    // 重置子账号密码后使该账号所有已签发 token 失效（accessToken 与 refreshToken 均失效）
    if (isPasswordChange) {
      await this.incrementTokenVersion(id)
      await this.incrementRefreshTokenVersion(id)
    }
  }

  async delete(id: number) {
    const user = await this.repo.findOne({ where: { id } })
    if (!user) {
      throw new NotFoundException('子账号不存在')
    }
    if (user.role === AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('禁止删除超级管理员账号')
    }
    await this.repo.delete(id)
  }

  /** 递增 tokenVersion 使该用户所有已签发的 accessToken 失效 */
  async incrementTokenVersion(id: number) {
    await this.repo.increment({ id }, 'tokenVersion', 1)
  }

  /** 递增 refreshTokenVersion 使该用户所有已签发的 refreshToken 失效（刷新令牌单次轮换） */
  async incrementRefreshTokenVersion(id: number) {
    await this.repo.increment({ id }, 'refreshTokenVersion', 1)
  }
}

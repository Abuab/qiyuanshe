import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { AdminUser } from '../entities/AdminUser'

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
    return this.repo.find({ order: { createdAt: 'DESC' } })
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

    if (user.role === 'super_admin') {
      throw new ForbiddenException('无权操作超级管理员账号')
    }

    if (data.username && data.username !== user.username) {
      const existing = await this.repo.findOne({ where: { username: data.username } })
      if (existing) {
        throw new BadRequestException('账号已存在')
      }
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10)
    }

    await this.repo.update(id, data)
  }

  async delete(id: number) {
    const user = await this.repo.findOne({ where: { id } })
    if (!user) {
      throw new NotFoundException('子账号不存在')
    }
    if (user.role === 'super_admin') {
      throw new ForbiddenException('禁止删除超级管理员账号')
    }
    await this.repo.delete(id)
  }
}

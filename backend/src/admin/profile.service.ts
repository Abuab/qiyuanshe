import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { AdminUser } from '../entities/AdminUser'

export interface UpdateAdminProfileDto {
  nickname?: string
  avatar?: string
  password?: string
}

@Injectable()
export class AdminProfileService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
  ) {}

  async updateProfile(adminId: number, dto: UpdateAdminProfileDto) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } })

    if (!admin) {
      throw new NotFoundException('管理员不存在')
    }

    if (dto.nickname !== undefined) {
      admin.nickname = dto.nickname
    }

    if (dto.avatar !== undefined) {
      admin.avatar = dto.avatar
    }

    if (dto.password) {
      admin.password = await bcrypt.hash(dto.password, 10)
    }

    await this.adminRepo.save(admin)

    return this.sanitizeAdmin(admin)
  }

  private sanitizeAdmin(admin: AdminUser) {
    return {
      id: admin.id,
      nickname: admin.nickname,
      username: admin.username,
      avatar: admin.avatar || '',
      role: admin.role,
    }
  }
}

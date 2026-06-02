import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User } from '../entities/User'

export interface UpdateAdminProfileDto {
  nickname?: string
  avatar?: string
  password?: string
}

@Injectable()
export class AdminProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async updateProfile(adminId: number, dto: UpdateAdminProfileDto) {
    const admin = await this.userRepository.findOne({ where: { id: adminId } })

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

    await this.userRepository.save(admin)

    return this.sanitizeAdmin(admin)
  }

  private sanitizeAdmin(admin: User) {
    return {
      id: admin.id,
      nickname: admin.nickname,
      username: 'admin',
      avatar: admin.avatar || '',
    }
  }
}

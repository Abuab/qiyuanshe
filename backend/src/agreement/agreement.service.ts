import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Agreement, AgreementType } from '../entities/Agreement'
import { CreateAgreementDto, UpdateAgreementDto } from './dto'

@Injectable()
export class AgreementService {
  constructor(
    @InjectRepository(Agreement)
    private readonly agreementRepository: Repository<Agreement>,
  ) {}

  /**
   * 获取当前生效的协议（每种类型返回最新一条 active 的）
   */
  async getActive(type: AgreementType): Promise<Agreement | null> {
    return this.agreementRepository.findOne({
      where: { type, isActive: 1 },
      order: { updatedAt: 'DESC' },
    })
  }

  /**
   * 获取协议列表（管理后台用）
   */
  async findAll(): Promise<Agreement[]> {
    return this.agreementRepository.find({
      order: { updatedAt: 'DESC' },
    })
  }

  /**
   * 创建或更新协议：同一 type 只保留一条 active 记录
   */
  async createOrUpdate(dto: CreateAgreementDto): Promise<Agreement> {
    // 将该 type 下所有旧记录设为 inactive
    await this.agreementRepository.update(
      { type: dto.type },
      { isActive: 0 },
    )

    // 创建新记录
    const agreement = this.agreementRepository.create({
      ...dto,
      isActive: 1,
    })

    return this.agreementRepository.save(agreement)
  }

  /**
   * 更新指定协议
   */
  async update(id: number, dto: UpdateAgreementDto): Promise<Agreement> {
    const agreement = await this.agreementRepository.findOne({ where: { id } })
    if (!agreement) {
      throw new NotFoundException('协议不存在')
    }
    Object.assign(agreement, dto)
    return this.agreementRepository.save(agreement)
  }

  /**
   * 删除协议
   */
  async remove(id: number): Promise<void> {
    const result = await this.agreementRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException('协议不存在')
    }
  }
}

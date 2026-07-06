import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PersonalityDimension } from './entities/PersonalityDimension'
import { PersonalityType } from './entities/PersonalityType'

/**
 * 人格测试 - 默认数据 Seeder
 *
 * 系统启动时，若维度/人格类型表为空则写入基础数据：
 * - 4 个维度（能量来源/信息获取/决策方式/生活方式）
 * - 16 种 MBTI 人格类型（编码 + 中文名 + 花名 + 默认雷达值）
 * 管理员可在后台继续编辑详细文案与雷达基准值。
 */
@Injectable()
export class PersonalityTestSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(PersonalityTestSeeder.name)

  private static readonly DIMENSIONS = [
    { code: 'energy', name: '能量来源', directionAKey: 'E', directionALabel: '外向型', directionBKey: 'I', directionBLabel: '内向型', icon: 'energy', sort: 1 },
    { code: 'info', name: '信息获取', directionAKey: 'S', directionALabel: '实感型', directionBKey: 'N', directionBLabel: '直觉型', icon: 'info', sort: 2 },
    { code: 'decision', name: '决策方式', directionAKey: 'T', directionALabel: '思考型', directionBKey: 'F', directionBLabel: '情感型', icon: 'decision', sort: 3 },
    { code: 'lifestyle', name: '生活方式', directionAKey: 'J', directionALabel: '判断型', directionBKey: 'P', directionBLabel: '知觉型', icon: 'lifestyle', sort: 4 },
  ]

  // radar: [energy, info, decision, lifestyle]，以各类型倾向粗略给出基准值
  private static readonly TYPES: Array<{ code: string; name: string; nickname: string; summary: string; radar: number[]; match: string[] }> = [
    { code: 'INTJ', name: '建筑师', nickname: '策略家', summary: '富有想象力和战略性的思想家，一切皆在计划之中。', radar: [20, 75, 80, 80], match: ['ENFP', 'ENTP'] },
    { code: 'INTP', name: '逻辑学家', nickname: '思想家', summary: '具有创造力的发明家，对知识有着止不住的渴望。', radar: [20, 80, 80, 30], match: ['ENTJ', 'ENFJ'] },
    { code: 'ENTJ', name: '指挥官', nickname: '统帅', summary: '大胆、富有想象力、意志强大的领导者。', radar: [80, 75, 80, 80], match: ['INTP', 'INFP'] },
    { code: 'ENTP', name: '辩论家', nickname: '发明家', summary: '聪明好奇的思想者，无法抵挡智力上的挑战。', radar: [80, 80, 75, 30], match: ['INFJ', 'INTJ'] },
    { code: 'INFJ', name: '提倡者', nickname: '哲学家', summary: '安静而神秘，鼓舞人心且不知疲倦的理想主义者。', radar: [20, 80, 30, 80], match: ['ENTP', 'ENFP'] },
    { code: 'INFP', name: '调停者', nickname: '诗人', summary: '诗意、善良的利他主义者，热心为正义事业出力。', radar: [20, 80, 25, 30], match: ['ENFJ', 'ENTJ'] },
    { code: 'ENFJ', name: '主人公', nickname: '教育家', summary: '富有魅力、鼓舞人心的领导者，能感染听众。', radar: [80, 75, 30, 80], match: ['INFP', 'ISFP'] },
    { code: 'ENFP', name: '竞选者', nickname: '公关达人', summary: '热情、有创造力、爱社交的自由精神。', radar: [80, 80, 30, 30], match: ['INFJ', 'INTJ'] },
    { code: 'ISTJ', name: '物流师', nickname: '检查员', summary: '务实、注重事实，可靠性毋庸置疑。', radar: [25, 25, 75, 80], match: ['ESFP', 'ESTP'] },
    { code: 'ISFJ', name: '守卫者', nickname: '守护者', summary: '非常专注、温暖的守护者，时刻准备保护所爱之人。', radar: [25, 25, 30, 80], match: ['ESFP', 'ESTP'] },
    { code: 'ESTJ', name: '总经理', nickname: '管理者', summary: '出色的管理者，在管理事务或人员方面无与伦比。', radar: [80, 25, 75, 80], match: ['ISFP', 'ISTP'] },
    { code: 'ESFJ', name: '执政官', nickname: '主人', summary: '极有同情心、爱交往、受欢迎的人，乐于助人。', radar: [80, 25, 30, 80], match: ['ISFP', 'ISTP'] },
    { code: 'ISTP', name: '鉴赏家', nickname: '巧匠', summary: '大胆而实际的实验家，擅长使用各种工具。', radar: [25, 30, 75, 30], match: ['ESFJ', 'ESTJ'] },
    { code: 'ISFP', name: '探险家', nickname: '艺术家', summary: '灵活、有魅力的艺术家，时刻准备探索新事物。', radar: [25, 30, 30, 30], match: ['ENFJ', 'ESFJ'] },
    { code: 'ESTP', name: '企业家', nickname: '挑战者', summary: '聪明、精力充沛、善于感知，真心享受生活在边缘。', radar: [80, 30, 75, 25], match: ['ISFJ', 'ISTJ'] },
    { code: 'ESFP', name: '表演者', nickname: '演艺家', summary: '自发的、精力充沛、热情的表演者，身边永不无聊。', radar: [80, 30, 30, 25], match: ['ISFJ', 'ISTJ'] },
  ]

  constructor(
    @InjectRepository(PersonalityDimension)
    private readonly dimensionRepo: Repository<PersonalityDimension>,
    @InjectRepository(PersonalityType)
    private readonly typeRepo: Repository<PersonalityType>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.seedDimensions()
      await this.seedTypes()
    } catch (e: any) {
      this.logger.warn(`人格测试基础数据初始化失败: ${e?.message}`)
    }
  }

  private async seedDimensions(): Promise<void> {
    const count = await this.dimensionRepo.count()
    if (count > 0) return
    const entities = PersonalityTestSeeder.DIMENSIONS.map((d) =>
      this.dimensionRepo.create({ ...d, isEnabled: 1, isDeleted: 0 }),
    )
    await this.dimensionRepo.save(entities)
    this.logger.log(`已初始化 ${entities.length} 个人格测试维度`)
  }

  private async seedTypes(): Promise<void> {
    const count = await this.typeRepo.count()
    if (count > 0) return
    const entities = PersonalityTestSeeder.TYPES.map((t, idx) =>
      this.typeRepo.create({
        code: t.code,
        name: t.name,
        nickname: t.nickname,
        summary: t.summary,
        description: null,
        radarEnergy: t.radar[0],
        radarInfo: t.radar[1],
        radarDecision: t.radar[2],
        radarLifestyle: t.radar[3],
        matchTypes: t.match,
        sort: idx + 1,
        isEnabled: 1,
        isDeleted: 0,
      }),
    )
    await this.typeRepo.save(entities)
    this.logger.log(`已初始化 ${entities.length} 种人格类型`)
  }
}

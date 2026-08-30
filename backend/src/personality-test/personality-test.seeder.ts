import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PersonalityDimension } from './entities/PersonalityDimension'
import { PersonalityType } from './entities/PersonalityType'
import { PersonalityQuestion } from './entities/PersonalityQuestion'
import { PersonalityOption } from './entities/PersonalityOption'

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

  // 题目数据：与 migrations/1753000000005-SeedPersonalityQuestions.ts 保持一致。
  // 从零部署时，该迁移会在应用启动前执行，但维度尚未播种（维度由本 Seeder 在启动后写入），
  // 导致迁移内按维度 code 查不到 id 而跳过全部题目。故题目改由本 Seeder 在维度播种后写入。
  // 每条：[维度code, 题干, A文案, A方向key, B文案, B方向key]
  private static readonly QUESTIONS: Array<[string, string, string, string, string, string]> = [
    // ===== energy 能量来源 E外向 / I内向 =====
    ['energy', '周末假期，你更想怎么度过？', '约上三五好友出门热闹一番', 'E', '待在家里安静看书或追剧充电', 'I'],
    ['energy', '在聚会上，你通常会？', '主动和不同的人聊天认识新朋友', 'E', '和熟悉的一两个人待在一起', 'I'],
    ['energy', '一天忙碌的社交之后，你会觉得？', '意犹未尽、依旧精力充沛', 'E', '需要独处一会儿才能恢复', 'I'],
    ['energy', '遇到问题时，你更倾向于？', '找人聊聊，边说边理清思路', 'E', '先自己安静思考再做决定', 'I'],
    ['energy', '身处一个新环境，你更容易？', '很快和大家打成一片', 'E', '慢热，需要时间慢慢适应', 'I'],
    ['energy', '你更喜欢的工作氛围是？', '团队协作、随时交流', 'E', '独立空间、专注做事', 'I'],
    ['energy', '表达想法时，你习惯？', '直接说出来，在交流中完善', 'E', '想清楚了再表达', 'I'],
    ['energy', '认识新朋友，你的感觉是？', '是件让人兴奋的事', 'E', '有点消耗精力', 'I'],

    // ===== info 信息获取 S实感 / N直觉 =====
    ['info', '了解一件新事物时，你更关注？', '具体的事实和细节', 'S', '背后的可能性和意义', 'N'],
    ['info', '做判断时，你更相信？', '亲眼所见的实际经验', 'S', '自己的直觉和灵感', 'N'],
    ['info', '做计划时，你倾向于？', '一步一步、脚踏实地', 'S', '先定大方向和愿景', 'N'],
    ['info', '别人形容你更像？', '务实、注重当下', 'S', '有想象力、着眼未来', 'N'],
    ['info', '学习新技能时，你喜欢？', '按部就班照着步骤来', 'S', '先理解原理再灵活发挥', 'N'],
    ['info', '描述一个地方，你会更多提到？', '看到的具体样子', 'S', '它带给你的感觉和联想', 'N'],
    ['info', '你更享受？', '把手头的事做得扎实', 'S', '探索还没人尝试过的点子', 'N'],
    ['info', '面对一份说明书，你会？', '认真读完每一步', 'S', '大概看看就上手摸索', 'N'],

    // ===== decision 决策方式 T思考 / F情感 =====
    ['decision', '做决定时，你更看重？', '逻辑和客观事实', 'T', '感受和对他人的影响', 'F'],
    ['decision', '朋友向你倾诉烦恼，你更可能？', '帮他分析问题、给出建议', 'T', '先安慰、共情他的心情', 'F'],
    ['decision', '评价一件事，你更在意？', '是否公平、合理', 'T', '是否让大家都舒服', 'F'],
    ['decision', '和人意见不合时，你倾向？', '就事论事把对错讲清楚', 'T', '尽量照顾彼此的感受', 'F'],
    ['decision', '你更希望别人觉得你？', '理性、公正', 'T', '温暖、体贴', 'F'],
    ['decision', '团队做选择时，你会先考虑？', '哪个方案效率最高', 'T', '哪个方案大家更认同', 'F'],
    ['decision', '面对批评，你更关注？', '内容是否有道理', 'T', '对方的语气和态度', 'F'],
    ['decision', '给别人反馈时，你倾向？', '直接指出问题所在', 'T', '委婉一些照顾对方情绪', 'F'],

    // ===== lifestyle 生活方式 J判断 / P知觉 =====
    ['lifestyle', '对于日程安排，你更喜欢？', '提前计划好、井井有条', 'J', '灵活随性、见机行事', 'P'],
    ['lifestyle', '出门旅行，你会？', '做好详细攻略', 'J', '说走就走、随遇而安', 'P'],
    ['lifestyle', '面对截止日期，你通常？', '早早完成、留有余地', 'J', '临近才进入状态', 'P'],
    ['lifestyle', '你的桌面或房间更倾向？', '整洁有序', 'J', '随意但自己知道东西在哪', 'P'],
    ['lifestyle', '计划有变时，你会？', '有点不适应，更想按原计划', 'J', '觉得没关系，随时调整', 'P'],
    ['lifestyle', '你更享受哪种感觉？', '把事情一件件确定下来', 'J', '保留多种选择的可能', 'P'],
    ['lifestyle', '做事风格上，你更像？', '目标导向、追求完成', 'J', '过程导向、享受体验', 'P'],
    ['lifestyle', '对于规则，你的态度是？', '遵守既定规则让人安心', 'J', '规则可以灵活变通', 'P'],
  ]

  constructor(
    @InjectRepository(PersonalityDimension)
    private readonly dimensionRepo: Repository<PersonalityDimension>,
    @InjectRepository(PersonalityType)
    private readonly typeRepo: Repository<PersonalityType>,
    @InjectRepository(PersonalityQuestion)
    private readonly questionRepo: Repository<PersonalityQuestion>,
    @InjectRepository(PersonalityOption)
    private readonly optionRepo: Repository<PersonalityOption>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.seedDimensions()
      await this.seedTypes()
      await this.seedQuestions()
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
    this.logger.debug(`已初始化 ${entities.length} 个人格测试维度`)
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
    this.logger.debug(`已初始化 ${entities.length} 种人格类型`)
  }

  private async seedQuestions(): Promise<void> {
    const count = await this.questionRepo.count()
    if (count > 0) return

    const dims = await this.dimensionRepo.find()
    const dimIdByCode = new Map(dims.map((d) => [d.code, d.id]))

    let sort = 0
    for (const [dimCode, content, aText, aKey, bText, bKey] of PersonalityTestSeeder.QUESTIONS) {
      const dimId = dimIdByCode.get(dimCode)
      if (!dimId) {
        this.logger.warn(`人格测试维度 ${dimCode} 不存在，跳过题目「${content}」`)
        continue
      }
      sort += 1
      const question = await this.questionRepo.save(
        this.questionRepo.create({
          content,
          dimensionId: dimId,
          sort,
          isEnabled: 1,
          isDeleted: 0,
        }),
      )
      await this.optionRepo.save([
        this.optionRepo.create({
          questionId: question.id,
          optionLabel: 'A',
          content: aText,
          directionKey: aKey,
          score: 1,
          sort: 0,
        }),
        this.optionRepo.create({
          questionId: question.id,
          optionLabel: 'B',
          content: bText,
          directionKey: bKey,
          score: 1,
          sort: 1,
        }),
      ])
    }
    this.logger.debug(`已初始化 ${sort} 道人格测试题目`)
  }
}

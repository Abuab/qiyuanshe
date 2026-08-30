import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Matchmaker } from '../entities/Matchmaker'
import { HotQuestion } from '../entities/HotQuestion'
import { MessageTemplate } from '../entities/MessageTemplate'
import { OperationTag } from '../entities/OperationTag'
import { QuickQuestion } from '../entities/QuickQuestion'
import { QuickQuestionCategory } from '../entities/QuickQuestionCategory'

/**
 * 运营配置默认数据 Seeder
 *
 * 从零部署时，以下字典/配置表没有种子来源，会导致相关功能开箱即空。
 * 本 Seeder 在应用启动时对每张表做「空则写入」的幂等播种，自愈性优于
 * 仅首次 MySQL 初始化执行的 init.sql（init.sql 仅在数据卷为空时运行一次）。
 *
 * 播种范围：
 * - matchmakers 红娘
 * - hot_questions 热门问题
 * - message_templates 系统消息模板
 * - operation_tags 运营标签
 * - quick_question_categories / quick_questions 快捷问题
 */
@Injectable()
export class ConfigSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConfigSeederService.name)

  private static readonly MATCHMAKERS = [
    { name: '妮妮', avatar: 'https://date.arvine.cn/uploads/upload-1781615721165-991458889.jpeg', title: '资深红娘', wechat: 'liayi123', phone: '13800138001', qrCode: '/uploads/upload-1780644804240-550018623.png', description: '从事婚恋行业15年，成功撮合超过500对新人。', sortOrder: 1 },
    { name: '王姐', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangjie', title: '金牌红娘', wechat: 'wangjie456', phone: '13800138002', qrCode: '/uploads/upload-1780644816360-270474464.png', description: '专注年轻白领群体，同城匹配成功率高达80%。', sortOrder: 2 },
    { name: '张老师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang', title: '首席红娘', wechat: 'zhanglaoshi789', phone: '13800138003', qrCode: '/uploads/upload-1780644824293-529015578.png', description: '20年资深红娘，擅长为大龄单身人士牵线搭桥。', sortOrder: 3 },
  ]

  private static readonly HOT_QUESTIONS = [
    { title: '相亲第一次见面应该聊什么？', content: '第一次相亲见面，不知道该聊什么话题，怕尴尬冷场。' },
    { title: '离异带孩子还能找到幸福吗？', content: '离异带一个5岁女孩，很担心对方不能接受。' },
    { title: '如何看待婚前财产公证？', content: '准备结婚，对方提出要做婚前财产公证。' },
    { title: '异地恋真的能修成正果吗？', content: '和男朋友异地两年了，不知道要不要坚持下去。' },
    { title: '30岁还没结婚算大龄剩女吗？', content: '今年30岁了，身边朋友大多已婚。' },
    { title: '二婚和头婚最大的区别是什么？', content: '经历过一次失败的婚姻，现在准备重新开始。' },
    { title: '如何判断对方是真心还是玩玩？', content: '网上认识了一个男生，不确定他是不是认真的。' },
    { title: '彩礼到底多少合适？', content: '双方家庭因为彩礼金额谈不拢。' },
    { title: '婚后要不要和公婆同住？', content: '男朋友是独生子，婚后可能需要和公婆同住。' },
    { title: '闪婚靠谱吗？', content: '认识三个月就结婚了，但感觉他就是对的人。' },
  ]

  private static readonly MESSAGE_TEMPLATES = [
    { name: '欢迎新用户', title: '欢迎加入栖缘社', content: '亲爱的{nickname}，欢迎加入栖缘社！这里是真诚婚恋的平台，祝您早日找到心仪的另一半。', category: 'greeting' },
    { name: '注册成功通知', title: '注册成功', content: '{nickname}，恭喜您已成功注册栖缘社。请完善个人资料，提高匹配成功率。', category: 'greeting' },
    { name: '资料审核通过', title: '资料审核通过', content: '{nickname}，您的资料已通过审核，现在可以正常使用平台所有功能了。', category: 'notification' },
    { name: '资料审核未通过', title: '资料审核通知', content: '{nickname}，您的资料未通过审核，原因：{reason}。请修改后重新提交。', category: 'notification' },
    { name: '匹配推荐提醒', title: '为您推荐了新的匹配对象', content: '{nickname}，根据您的条件，我们为您推荐了新匹配对象，快去看看吧！', category: 'notification' },
    { name: 'VIP到期提醒', title: 'VIP即将到期', content: '{nickname}，您的VIP会员将于{days}天后到期，续费可继续享受专属服务。', category: 'reminder' },
    { name: '活动邀请', title: '平台活动邀请', content: '{nickname}，栖缘社最新活动「{activity}」即将开始，点击查看详情。', category: 'marketing' },
    { name: '节日祝福', title: '节日快乐', content: '{nickname}，栖缘社祝您节日快乐！愿您早日遇见爱情。', category: 'marketing' },
  ]

  private static readonly OPERATION_TAGS = [
    { name: '高活跃', color: '#67C23A' },
    { name: '潜力用户', color: '#409EFF' },
    { name: '重点跟进', color: '#E6A23C' },
    { name: '高价值', color: '#F56C6C' },
    { name: '新注册', color: '#909399' },
    { name: '流失预警', color: '#F56C6C' },
    { name: 'VIP到期临近', color: '#E6A23C' },
    { name: '已约见', color: '#67C23A' },
  ]

  private static readonly QUICK_QUESTION_CATEGORIES = [
    { name: '脱单攻略', sort: 1 },
    { name: '平台介绍', sort: 2 },
    { name: '情感咨询', sort: 3 },
  ]

  // categoryIndex 对应 QUICK_QUESTION_CATEGORIES 的顺序
  private static readonly QUICK_QUESTIONS: Array<{ content: string; categoryIndex: number }> = [
    // 脱单攻略
    { content: '怎样才能快速脱单？', categoryIndex: 0 },
    { content: '第一次见面聊什么？', categoryIndex: 0 },
    { content: '如何提高匹配成功率？', categoryIndex: 0 },
    { content: '如何写吸引人的自我介绍？', categoryIndex: 0 },
    { content: '约会应该注意什么？', categoryIndex: 0 },
    { content: '怎么判断对方是否对我有意思？', categoryIndex: 0 },
    { content: '相亲时问什么问题比较好？', categoryIndex: 0 },
    // 平台介绍
    { content: '这个平台怎么用？', categoryIndex: 1 },
    { content: '如何完善个人资料？', categoryIndex: 1 },
    { content: '平台有哪些功能？', categoryIndex: 1 },
    { content: '什么是红娘牵线？', categoryIndex: 1 },
    { content: 'VIP 有什么特权？', categoryIndex: 1 },
    { content: '如何通过实名认证？', categoryIndex: 1 },
    { content: '脱单成功率怎么样？', categoryIndex: 1 },
    // 情感咨询
    { content: '恋爱中如何保持新鲜感？', categoryIndex: 2 },
    { content: '和相亲对象聊什么话题？', categoryIndex: 2 },
    { content: '异地恋怎么维持？', categoryIndex: 2 },
    { content: '如何化解恋爱中的矛盾？', categoryIndex: 2 },
    { content: '感觉对方冷淡了怎么办？', categoryIndex: 2 },
    { content: '被拒绝了怎么调整心态？', categoryIndex: 2 },
  ]

  constructor(
    @InjectRepository(Matchmaker)
    private readonly matchmakerRepo: Repository<Matchmaker>,
    @InjectRepository(HotQuestion)
    private readonly hotQuestionRepo: Repository<HotQuestion>,
    @InjectRepository(MessageTemplate)
    private readonly templateRepo: Repository<MessageTemplate>,
    @InjectRepository(OperationTag)
    private readonly tagRepo: Repository<OperationTag>,
    @InjectRepository(QuickQuestionCategory)
    private readonly qqCategoryRepo: Repository<QuickQuestionCategory>,
    @InjectRepository(QuickQuestion)
    private readonly qqRepo: Repository<QuickQuestion>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedMatchmakers()
    await this.seedHotQuestions()
    await this.seedMessageTemplates()
    await this.seedOperationTags()
    await this.seedQuickQuestions()
  }

  private async seedMatchmakers(): Promise<void> {
    try {
      const count = await this.matchmakerRepo.count()
      if (count > 0) return
      for (const m of ConfigSeederService.MATCHMAKERS) {
        await this.matchmakerRepo.save(this.matchmakerRepo.create({ ...m, isActive: 1 }))
      }
      this.logger.debug(`已初始化 ${ConfigSeederService.MATCHMAKERS.length} 位红娘`)
    } catch (e: any) {
      this.logger.warn(`红娘数据初始化失败: ${e?.message}`)
    }
  }

  private async seedHotQuestions(): Promise<void> {
    try {
      const count = await this.hotQuestionRepo.count()
      if (count > 0) return
      const entities = ConfigSeederService.HOT_QUESTIONS.map((q, idx) =>
        this.hotQuestionRepo.create({
          title: q.title,
          content: q.content,
          isActive: 1,
          status: 1,
          sortOrder: idx + 1,
          answerCount: 0,
          creatorId: null,
        }),
      )
      await this.hotQuestionRepo.save(entities)
      this.logger.debug(`已初始化 ${entities.length} 个热门问题`)
    } catch (e: any) {
      this.logger.warn(`热门问题数据初始化失败: ${e?.message}`)
    }
  }

  private async seedMessageTemplates(): Promise<void> {
    try {
      const count = await this.templateRepo.count()
      if (count > 0) return
      const entities = ConfigSeederService.MESSAGE_TEMPLATES.map((t) =>
        this.templateRepo.create({
          name: t.name,
          title: t.title,
          content: t.content,
          category: t.category,
          placeholders: null,
          useCount: 0,
          lastUsedAt: null,
          isDeleted: 0,
          sortOrder: 0,
        }),
      )
      await this.templateRepo.save(entities)
      this.logger.debug(`已初始化 ${entities.length} 条消息模板`)
    } catch (e: any) {
      this.logger.warn(`消息模板数据初始化失败: ${e?.message}`)
    }
  }

  private async seedOperationTags(): Promise<void> {
    try {
      const count = await this.tagRepo.count()
      if (count > 0) return
      const entities = ConfigSeederService.OPERATION_TAGS.map((t, idx) =>
        this.tagRepo.create({
          name: t.name,
          color: t.color,
          isEnabled: 1,
          sortOrder: idx + 1,
          isDeleted: 0,
        }),
      )
      await this.tagRepo.save(entities)
      this.logger.debug(`已初始化 ${entities.length} 个运营标签`)
    } catch (e: any) {
      this.logger.warn(`运营标签数据初始化失败: ${e?.message}`)
    }
  }

  private async seedQuickQuestions(): Promise<void> {
    try {
      const catCount = await this.qqCategoryRepo.count()
      const qCount = await this.qqRepo.count()
      if (catCount > 0 && qCount > 0) return

      let categories: QuickQuestionCategory[] = []
      if (catCount === 0) {
        categories = await this.qqCategoryRepo.save(
          ConfigSeederService.QUICK_QUESTION_CATEGORIES.map((c) =>
            this.qqCategoryRepo.create({ name: c.name, sort: c.sort, isEnabled: 1, isDeleted: 0 }),
          ),
        )
      } else {
        categories = await this.qqCategoryRepo.find({ order: { sort: 'ASC' } })
      }

      if (qCount === 0) {
        const entities: QuickQuestion[] = []
        const sortByCategory = new Map<number, number>()
        for (const q of ConfigSeederService.QUICK_QUESTIONS) {
          const category = categories[q.categoryIndex]
          if (!category) continue
          const next = (sortByCategory.get(category.id) || 0) + 1
          sortByCategory.set(category.id, next)
          entities.push(
            this.qqRepo.create({
              content: q.content,
              categoryId: category.id,
              sort: next,
              isEnabled: 1,
              clickCount: 0,
              isDeleted: 0,
            }),
          )
        }
        await this.qqRepo.save(entities)
        this.logger.debug(`已初始化 ${entities.length} 条快捷问题`)
      }
    } catch (e: any) {
      this.logger.warn(`快捷问题数据初始化失败: ${e?.message}`)
    }
  }
}

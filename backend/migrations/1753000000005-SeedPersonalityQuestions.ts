import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 人格测试题库种子数据（MBTI 四维度，每维度 8 题，共 32 题 64 选项）
 *
 * 说明：
 * - 维度与人格类型此前已配置（personality_dimensions 4 条 / personality_types 16 条）
 * - 本迁移仅补充题目与选项，使 /personality/questions 有可用题目
 * - 幂等：若 personality_questions 已存在启用题目则整体跳过，避免重复插入
 * - 全部文案合规，不含「算命/运势/命理/占卜」等敏感词
 */
export class SeedPersonalityQuestions1753000000005 implements MigrationInterface {
  name = 'SeedPersonalityQuestions1753000000005'

  // 每条：[维度code, 题干, A文案, A方向key, B文案, B方向key]
  private readonly data: Array<[string, string, string, string, string, string]> = [
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

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 表不存在则跳过（迁移顺序保护）
    const tableExists = async (t: string) => {
      const r = await queryRunner.query(
        `SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [t],
      )
      return Number(r?.[0]?.c) > 0
    }
    if (
      !(await tableExists('personality_questions')) ||
      !(await tableExists('personality_options')) ||
      !(await tableExists('personality_dimensions'))
    ) {
      return
    }

    // 幂等：已存在题目则跳过
    const existing = await queryRunner.query('SELECT COUNT(*) AS c FROM `personality_questions`')
    if (Number(existing?.[0]?.c) > 0) {
      console.log('[migration:SeedPersonalityQuestions] 已存在题目，跳过种子')
      return
    }

    // 维度 code -> id
    const dims: Array<{ id: number; code: string }> = await queryRunner.query(
      'SELECT id, code FROM `personality_dimensions`',
    )
    const dimIdByCode = new Map(dims.map((d) => [d.code, d.id]))

    let sort = 0
    for (const [dimCode, content, aText, aKey, bText, bKey] of this.data) {
      const dimId = dimIdByCode.get(dimCode)
      if (!dimId) {
        console.warn(`[migration:SeedPersonalityQuestions] 维度 ${dimCode} 不存在，跳过该题`)
        continue
      }
      sort += 1
      const res: any = await queryRunner.query(
        'INSERT INTO `personality_questions` (`content`, `dimensionId`, `sort`, `isEnabled`, `isDeleted`) VALUES (?, ?, ?, 1, 0)',
        [content, dimId, sort],
      )
      const questionId = res?.insertId
      if (!questionId) continue
      await queryRunner.query(
        'INSERT INTO `personality_options` (`questionId`, `optionLabel`, `content`, `directionKey`, `score`, `sort`) VALUES (?, ?, ?, ?, 1, 0), (?, ?, ?, ?, 1, 1)',
        [questionId, 'A', aText, aKey, questionId, 'B', bText, bKey],
      )
    }
    console.log(`[migration:SeedPersonalityQuestions] 已插入 ${this.data.length} 道题目`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 仅删除本迁移可能插入的种子（通过题干精确匹配），避免误删人工新增题目
    const contents = this.data.map((d) => d[1])
    if (contents.length === 0) return
    const placeholders = contents.map(() => '?').join(',')
    const rows: Array<{ id: number }> = await queryRunner.query(
      `SELECT id FROM \`personality_questions\` WHERE content IN (${placeholders})`,
      contents,
    )
    const ids = rows.map((r) => r.id)
    if (ids.length > 0) {
      const ph = ids.map(() => '?').join(',')
      await queryRunner.query(`DELETE FROM \`personality_options\` WHERE questionId IN (${ph})`, ids)
      await queryRunner.query(`DELETE FROM \`personality_questions\` WHERE id IN (${ph})`, ids)
    }
  }
}

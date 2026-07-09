import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, MoreThanOrEqual } from 'typeorm'
import { RedisService } from '../common/redis.service'
import { PersonalityResult } from './entities/PersonalityResult'
import { PersonalityType } from './entities/PersonalityType'
import { PersonalityDimension } from './entities/PersonalityDimension'
import { PersonalityQuestion } from './entities/PersonalityQuestion'
import { PersonalityOption } from './entities/PersonalityOption'
import { PersonalityAnswerRecord } from './entities/PersonalityAnswerRecord'
import { CopyStat } from '../guide-copy/entities/CopyStat'
import { CopySlot } from '../guide-copy/entities/CopySlot'
import { User } from '../entities/User'
import { PersonalityUserService } from './personality-user.service'
import { shanghaiDayKey } from './personality-time.util'
import { beijingISO } from '../common/utils/date-utils'

/**
 * 人格测试 - 管理后台数据看板统计服务
 *
 * 注册用户结果取自 MySQL；游客总量/当日/开始/完成计数取自 Redis 累加器（PersonalityUserService 埋点）。
 * 维度/题目/类型分布均基于注册用户已落库数据（游客结果为 Redis 临时数据不参与）。
 */
@Injectable()
export class PersonalityStatsService {
  constructor(
    @InjectRepository(PersonalityResult)
    private readonly resultRepo: Repository<PersonalityResult>,
    @InjectRepository(PersonalityType)
    private readonly typeRepo: Repository<PersonalityType>,
    @InjectRepository(PersonalityDimension)
    private readonly dimensionRepo: Repository<PersonalityDimension>,
    @InjectRepository(PersonalityQuestion)
    private readonly questionRepo: Repository<PersonalityQuestion>,
    @InjectRepository(PersonalityOption)
    private readonly optionRepo: Repository<PersonalityOption>,
    @InjectRepository(PersonalityAnswerRecord)
    private readonly answerRepo: Repository<PersonalityAnswerRecord>,
    @InjectRepository(CopyStat)
    private readonly copyStatRepo: Repository<CopyStat>,
    @InjectRepository(CopySlot)
    private readonly copySlotRepo: Repository<CopySlot>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly redis: RedisService,
  ) {}

  private statKey(name: string): string {
    return `${PersonalityUserService.STAT_PREFIX}:${name}`
  }

  private async readNum(key: string): Promise<number> {
    try {
      const v = await this.redis.get(key)
      const n = v ? parseInt(v, 10) : 0
      return Number.isFinite(n) ? n : 0
    } catch {
      return 0
    }
  }

  /** 东八区今日 00:00 的 Date（用于「今日新增」筛选） */
  private todayStart(): Date {
    // shanghaiDayKey() 形如 20260706（无分隔符），需格式化为合法 ISO 字符串再解析
    const key = shanghaiDayKey()
    const iso = `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}T00:00:00+08:00`
    return new Date(iso)
  }

  // ==================== 概览卡片 ====================

  async overview() {
    const registeredTotal = await this.resultRepo.count({ where: { isDeleted: 0 } })
    const guestTotal = await this.readNum(this.statKey('guest_total'))
    const todayNewRegistered = await this.resultRepo.count({
      where: { isDeleted: 0, testedAt: MoreThanOrEqual(this.todayStart()) },
    })
    const todayNewGuest = await this.readNum(this.statKey(`guest_daily:${shanghaiDayKey()}`))
    const startedTotal = await this.readNum(this.statKey('started'))
    const completedTotal = await this.readNum(this.statKey('completed'))

    // 平均答题时长：用 SQL AVG 聚合 durationSeconds 列，避免读取整表 JSON 到内存
    const avgRow = await this.resultRepo
      .createQueryBuilder('r')
      .select('AVG(r.durationSeconds)', 'avg')
      .where('r.isDeleted = 0')
      .andWhere('r.durationSeconds IS NOT NULL')
      .andWhere('r.durationSeconds > 0')
      .getRawOne<{ avg: string | null }>()
    const avgDurationSeconds = avgRow?.avg ? Math.round(Number(avgRow.avg)) : 0
    const completionRate = startedTotal > 0 ? Math.round((completedTotal / startedTotal) * 1000) / 1000 : 0

    return {
      registeredTotal,
      guestTotal,
      total: registeredTotal + guestTotal,
      todayNew: todayNewRegistered + todayNewGuest,
      todayNewRegistered,
      todayNewGuest,
      avgDurationSeconds,
      startedTotal,
      completedTotal,
      completionRate,
    }
  }

  // ==================== 人格类型分布饼图 ====================

  async typeDistribution() {
    const grouped = await this.resultRepo
      .createQueryBuilder('r')
      .select('r.typeCode', 'typeCode')
      .addSelect('COUNT(*)', 'count')
      .where('r.isDeleted = 0')
      .groupBy('r.typeCode')
      .getRawMany<{ typeCode: string; count: string }>()

    const countMap = new Map<string, number>()
    let total = 0
    for (const g of grouped) {
      const c = parseInt(g.count, 10) || 0
      if (g.typeCode) countMap.set(g.typeCode, c)
      total += c
    }

    const types = await this.typeRepo.find({ where: { isDeleted: 0 }, order: { sort: 'ASC', id: 'ASC' } })
    const items = types.map((t) => {
      const count = countMap.get(t.code) || 0
      return {
        typeCode: t.code,
        typeName: t.name,
        nickname: t.nickname,
        count,
        ratio: total > 0 ? Math.round((count / total) * 1000) / 1000 : 0,
      }
    })
    return { total, items }
  }

  /** 某类型下的用户列表（下钻） */
  async typeUsers(typeCode: string, page = 1, pageSize = 20) {
    const skip = (Math.max(1, page) - 1) * pageSize
    const [results, total] = await this.resultRepo.findAndCount({
      where: { typeCode, isDeleted: 0 },
      order: { testedAt: 'DESC' },
      skip,
      take: pageSize,
    })
    const userIds = results.map((r) => Number(r.userId)).filter(Boolean)
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) }, select: ['id', 'nickname', 'avatar', 'gender'] })
      : []
    const userMap = new Map(users.map((u) => [Number(u.id), u]))
    const list = results.map((r) => {
      const u = userMap.get(Number(r.userId))
      return {
        userId: Number(r.userId),
        nickname: u?.nickname || `用户${r.userId}`,
        avatar: u?.avatar || '',
        gender: u?.gender ?? 0,
        testedAt: r.testedAt ? beijingISO(r.testedAt) : null,
      }
    })
    return { total, page, pageSize, list }
  }

  // ==================== 四维度分布柱状图 ====================

  async dimensionDistribution() {
    // dimCode -> (label -> count)
    const map = new Map<string, { name: string; labels: Map<string, number> }>()
    // 分批扫描，避免整表结果一次性驻留内存（维度分布依赖逐行 JSON，无法纯 SQL 聚合）
    const batchSize = 500
    let skip = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rows = await this.resultRepo.find({
        where: { isDeleted: 0 },
        select: ['id', 'dimensionScores'],
        order: { id: 'ASC' },
        skip,
        take: batchSize,
      })
      if (rows.length === 0) break
      for (const r of rows) {
        const dims = (r.dimensionScores as any)?.dimensions
        if (!Array.isArray(dims)) continue
        for (const d of dims) {
          if (!d?.code) continue
          if (!map.has(d.code)) map.set(d.code, { name: d.name || d.code, labels: new Map() })
          const entry = map.get(d.code)!
          const label = d.chosenLabel || d.chosenKey || '未知'
          entry.labels.set(label, (entry.labels.get(label) || 0) + 1)
        }
      }
      if (rows.length < batchSize) break
      skip += batchSize
    }
    const items = Array.from(map.entries()).map(([code, v]) => {
      const total = Array.from(v.labels.values()).reduce((a, b) => a + b, 0)
      const directions = Array.from(v.labels.entries()).map(([label, count]) => ({
        label,
        count,
        ratio: total > 0 ? Math.round((count / total) * 1000) / 1000 : 0,
      }))
      return { code, name: v.name, total, directions }
    })
    return { items }
  }

  // ==================== 题目选项统计 ====================

  async questionStats() {
    const grouped = await this.answerRepo
      .createQueryBuilder('a')
      .select('a.questionId', 'questionId')
      .addSelect('a.optionId', 'optionId')
      .addSelect('COUNT(*)', 'count')
      .where('a.isDeleted = 0')
      .groupBy('a.questionId')
      .addGroupBy('a.optionId')
      .getRawMany<{ questionId: number; optionId: number; count: string }>()

    if (grouped.length === 0) return { items: [] }

    const questionIds = [...new Set(grouped.map((g) => Number(g.questionId)))]
    const optionIds = [...new Set(grouped.map((g) => Number(g.optionId)))]
    const questions = await this.questionRepo.find({ where: { id: In(questionIds) } })
    const options = await this.optionRepo.find({ where: { id: In(optionIds) } })
    const qMap = new Map(questions.map((q) => [q.id, q]))
    const oMap = new Map(options.map((o) => [o.id, o]))

    // questionId -> [{optionId, count}]
    const byQuestion = new Map<number, Array<{ optionId: number; count: number }>>()
    for (const g of grouped) {
      const qid = Number(g.questionId)
      if (!byQuestion.has(qid)) byQuestion.set(qid, [])
      byQuestion.get(qid)!.push({ optionId: Number(g.optionId), count: parseInt(g.count, 10) || 0 })
    }

    const items = Array.from(byQuestion.entries()).map(([qid, opts]) => {
      const total = opts.reduce((a, b) => a + b.count, 0)
      return {
        questionId: qid,
        content: qMap.get(qid)?.content || `题目${qid}`,
        total,
        options: opts.map((o) => ({
          optionId: o.optionId,
          content: oMap.get(o.optionId)?.content || `选项${o.optionId}`,
          count: o.count,
          ratio: total > 0 ? Math.round((o.count / total) * 1000) / 1000 : 0,
        })),
      }
    })
    // 按题目 sort 排序
    items.sort((a, b) => (qMap.get(a.questionId)?.sort || 0) - (qMap.get(b.questionId)?.sort || 0))
    return { items }
  }

  // ==================== 文案转化漏斗 ====================

  async funnel() {
    const grouped = await this.copyStatRepo
      .createQueryBuilder('s')
      .select('s.slotId', 'slotId')
      .addSelect('SUM(s.impressions)', 'impressions')
      .addSelect('SUM(s.clicks)', 'clicks')
      .addSelect('SUM(s.loginConversions)', 'conversions')
      .groupBy('s.slotId')
      .getRawMany<{ slotId: number; impressions: string; clicks: string; conversions: string }>()

    const slots = await this.copySlotRepo.find()
    const slotMap = new Map(slots.map((s) => [s.id, s]))
    const items = grouped.map((g) => {
      const impressions = parseInt(g.impressions, 10) || 0
      const clicks = parseInt(g.clicks, 10) || 0
      const conversions = parseInt(g.conversions, 10) || 0
      const slot = slotMap.get(Number(g.slotId))
      return {
        slotId: Number(g.slotId),
        slotCode: slot?.code || String(g.slotId),
        slotName: slot?.name || `文案位${g.slotId}`,
        impressions,
        clicks,
        conversions,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 1000 : 0,
        cvr: clicks > 0 ? Math.round((conversions / clicks) * 1000) / 1000 : 0,
      }
    })
    items.sort((a, b) => b.impressions - a.impressions)
    return { items }
  }

  // ==================== 首页浮动按钮：测一测模式点击 ====================

  async floatButton() {
    const slot = await this.copySlotRepo.findOne({ where: { code: 'home_float_button' } })
    let testModeImpressions = 0
    let testModeClicks = 0
    let testModeConversions = 0
    if (slot) {
      const row = await this.copyStatRepo
        .createQueryBuilder('s')
        .select('SUM(s.impressions)', 'impressions')
        .addSelect('SUM(s.clicks)', 'clicks')
        .addSelect('SUM(s.loginConversions)', 'conversions')
        .where('s.slotId = :id', { id: slot.id })
        .getRawOne<{ impressions: string; clicks: string; conversions: string }>()
      testModeImpressions = parseInt(row?.impressions || '0', 10) || 0
      testModeClicks = parseInt(row?.clicks || '0', 10) || 0
      testModeConversions = parseInt(row?.conversions || '0', 10) || 0
    }
    return {
      // 测一测模式：来自「首页浮动按钮」文案位统计
      testModeImpressions,
      testModeClicks,
      testModeConversions,
      // 问媒模式点击未接入独立埋点，暂不单独统计
      askModeTracked: false,
      askModeClicks: null as number | null,
    }
  }
}

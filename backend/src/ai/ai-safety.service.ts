import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RedisService } from '../common/redis.service'
import { ContentSafetyAudit, SafetyAuditResult, BlockReasonType } from '../entities/ContentSafetyAudit'

/**
 * AI 内容安全过滤服务（三级过滤体系）
 *
 * 职责：
 * 1. 三级敏感词匹配：一级拦截/二级替换/三级标记复核
 * 2. 命中后写入 ContentSafetyAudit 表
 * 3. 每日累计违规次数追踪（Redis）
 * 4. 为其他 AI Service 提供统一的过滤入口
 */

/** 敏感词过滤级别 */
export enum SafetyFilterLevel {
  /** 一级：直接拦截，返回"内容优化中" */
  BLOCK = 1,
  /** 二级：替换或移除敏感部分后展示，并记录警告 */
  REPLACE = 2,
  /** 三级：展示但标记待人工复核 */
  FLAG = 3,
}

export interface SafetyHitResult {
  passed: boolean
  hitWords: string[]
  blockReason: BlockReasonType | null
}

/** 三级过滤扩展结果 */
export interface TieredSafetyResult {
  /** 整体是否通过（一级命中 = 不通过） */
  passed: boolean
  /** 一级拦截词命中 */
  level1Hits: string[]
  /** 二级替换词命中 */
  level2Hits: string[]
  /** 三级标记词命中 */
  level3Hits: string[]
  /** 违规类别 */
  blockReason: BlockReasonType | null
  /** 是否需要人工复核 */
  needManualReview: boolean
}

/** 每日违规限次 Redis key 前缀 */
const DAILY_VIOLATION_KEY = 'ai:safety:daily:'

// ================================================================
// 一级拦截词库 —— 直接拒绝
// 色情、性器官、性暗示、性骚扰诱导、招嫖、裸聊、开房诱导、约炮
// ================================================================

const LEVEL1_WORDS: Record<string, BlockReasonType> = {
  // 色情/性器官
  '约炮': BlockReasonType.PORNOGRAPHY,
  '一夜情': BlockReasonType.PORNOGRAPHY,
  '裸聊': BlockReasonType.PORNOGRAPHY,
  '开房': BlockReasonType.PORNOGRAPHY,
  '上床': BlockReasonType.PORNOGRAPHY,
  '啪啪': BlockReasonType.PORNOGRAPHY,
  '炮友': BlockReasonType.PORNOGRAPHY,
  '包养': BlockReasonType.PORNOGRAPHY,
  '外围': BlockReasonType.PORNOGRAPHY,
  '援交': BlockReasonType.PORNOGRAPHY,
  '卖淫': BlockReasonType.PORNOGRAPHY,
  '嫖娼': BlockReasonType.PORNOGRAPHY,
  '色情': BlockReasonType.PORNOGRAPHY,
  'AV': BlockReasonType.PORNOGRAPHY,
  '做爱': BlockReasonType.PORNOGRAPHY,
  '性爱': BlockReasonType.PORNOGRAPHY,
  '性交': BlockReasonType.PORNOGRAPHY,
  '口交': BlockReasonType.PORNOGRAPHY,
  '肛交': BlockReasonType.PORNOGRAPHY,
  'SM': BlockReasonType.PORNOGRAPHY,
  'BDSM': BlockReasonType.PORNOGRAPHY,
  '调教': BlockReasonType.PORNOGRAPHY,
  '裸照': BlockReasonType.PORNOGRAPHY,
  '脱衣服': BlockReasonType.PORNOGRAPHY,

  // 性骚扰/性暗示诱导
  '睡一晚': BlockReasonType.HARASSMENT,
  '陪我一晚': BlockReasonType.HARASSMENT,
  '来我家坐坐': BlockReasonType.HARASSMENT,
  '我家没人': BlockReasonType.HARASSMENT,
  '床上功夫': BlockReasonType.HARASSMENT,
  '床上技术': BlockReasonType.HARASSMENT,
  '初夜': BlockReasonType.HARASSMENT,
  '酒店见': BlockReasonType.HARASSMENT,
  '约吗': BlockReasonType.HARASSMENT,
  '洗干净': BlockReasonType.HARASSMENT,
  '穿上丝袜': BlockReasonType.HARASSMENT,
  '黑丝': BlockReasonType.HARASSMENT,

  // 招嫖
  '卖淫女': BlockReasonType.PORNOGRAPHY,
  '小姐上门': BlockReasonType.PORNOGRAPHY,
}

// ================================================================
// 二级替换词库 —— 移除敏感部分后展示，记录警告
// 低俗身体描述、暧昧性比喻、过度亲密暗示
// ================================================================

const LEVEL2_WORDS: Record<string, BlockReasonType> = {
  '巨乳': BlockReasonType.PORNOGRAPHY,
  '翘臀': BlockReasonType.PORNOGRAPHY,
  '大胸': BlockReasonType.PORNOGRAPHY,
  '胸大': BlockReasonType.PORNOGRAPHY,
  '性感身材': BlockReasonType.PORNOGRAPHY,
  '床上': BlockReasonType.PORNOGRAPHY,
  '欲火': BlockReasonType.PORNOGRAPHY,
  '饥渴': BlockReasonType.PORNOGRAPHY,
  '想要你': BlockReasonType.HARASSMENT,
  '想要我': BlockReasonType.HARASSMENT,
  '寂寞难耐': BlockReasonType.HARASSMENT,
  '穿这么少': BlockReasonType.HARASSMENT,
  '你身材真好': BlockReasonType.HARASSMENT,
  '想不想试试': BlockReasonType.HARASSMENT,
  '给你看个好东西': BlockReasonType.HARASSMENT,
  '你懂得': BlockReasonType.HARASSMENT,
  '处男': BlockReasonType.HARASSMENT,
  '处女': BlockReasonType.HARASSMENT,
  '第一次': BlockReasonType.HARASSMENT,
  '成人': BlockReasonType.PORNOGRAPHY,
  '情趣': BlockReasonType.PORNOGRAPHY,
  '主人': BlockReasonType.HARASSMENT,
  '奴隶': BlockReasonType.HARASSMENT,
  '私密照': BlockReasonType.HARASSMENT,
  '不穿衣服': BlockReasonType.PORNOGRAPHY,
}

// ================================================================
// 三级标记词库 —— 展示但标记待人工复核
// 涉及金钱、投资、借款、隐私索取
// ================================================================

const LEVEL3_WORDS: Record<string, BlockReasonType> = {
  '投资理财': BlockReasonType.FRAUD,
  '稳赚不赔': BlockReasonType.FRAUD,
  '高回报': BlockReasonType.FRAUD,
  '内幕消息': BlockReasonType.FRAUD,
  '导师带单': BlockReasonType.FRAUD,
  '博彩': BlockReasonType.FRAUD,
  '赌博': BlockReasonType.FRAUD,
  '彩票': BlockReasonType.FRAUD,
  '下注': BlockReasonType.FRAUD,
  '赔率': BlockReasonType.FRAUD,
  '刷单返利': BlockReasonType.FRAUD,
  '刷信誉': BlockReasonType.FRAUD,
  '兼职打字员': BlockReasonType.FRAUD,
  '在家兼职': BlockReasonType.FRAUD,
  '转账给我': BlockReasonType.FRAUD,
  '转我': BlockReasonType.FRAUD,
  '借款': BlockReasonType.FRAUD,
  '借钱': BlockReasonType.FRAUD,
  '周转一下': BlockReasonType.FRAUD,
  '人民币': BlockReasonType.FRAUD,
  '加密货币': BlockReasonType.FRAUD,
  '比特币': BlockReasonType.FRAUD,
  'USDT': BlockReasonType.FRAUD,
  '火币': BlockReasonType.FRAUD,
  '平台漏洞': BlockReasonType.FRAUD,
  '套利': BlockReasonType.FRAUD,
  '搬砖': BlockReasonType.FRAUD,
  '资金盘': BlockReasonType.FRAUD,
}

// ================================================================
// 攻击/侮辱词库（一级拦截）
// ================================================================

const ATTACK_WORDS: [string, BlockReasonType][] = [
  ['傻逼', BlockReasonType.ATTACK],
  ['脑残', BlockReasonType.ATTACK],
  ['废物', BlockReasonType.ATTACK],
  ['垃圾', BlockReasonType.ATTACK],
  ['去死', BlockReasonType.ATTACK],
  ['丑八怪', BlockReasonType.ATTACK],
  ['矮冬瓜', BlockReasonType.ATTACK],
  ['肥猪', BlockReasonType.ATTACK],
  ['穷鬼', BlockReasonType.ATTACK],
  ['屌丝', BlockReasonType.ATTACK],
  ['loser', BlockReasonType.ATTACK],
]

// 合并所有词用于兼容旧方法
const ALL_LEVEL1 = { ...LEVEL1_WORDS }
ATTACK_WORDS.forEach(([w, r]) => { ALL_LEVEL1[w] = r })

const ALL_SENSITIVE_WORDS = [
  ...Object.keys(ALL_LEVEL1),
  ...Object.keys(LEVEL2_WORDS),
  ...Object.keys(LEVEL3_WORDS),
]

@Injectable()
export class AiSafetyService {
  private readonly logger = new Logger(AiSafetyService.name)

  constructor(
    @InjectRepository(ContentSafetyAudit)
    private readonly auditRepo: Repository<ContentSafetyAudit>,
    private readonly redis: RedisService,
  ) {}

  // ==================== 三级过滤（新增） ====================

  /**
   * 三级分级检查
   * @returns TieredSafetyResult
   */
  checkWithLevels(text: string): TieredSafetyResult {
    if (!text) {
      return { passed: true, level1Hits: [], level2Hits: [], level3Hits: [], blockReason: null, needManualReview: false }
    }

    const cleaned = text.toLowerCase().replace(/\s+/g, '')
    const level1Hits: string[] = []
    const level2Hits: string[] = []
    const level3Hits: string[] = []

    // 一级匹配
    for (const word of Object.keys(ALL_LEVEL1)) {
      if (cleaned.includes(word.toLowerCase())) {
        level1Hits.push(word)
      }
    }
    for (const word of Object.keys(LEVEL1_WORDS)) {
      if (cleaned.includes(word.toLowerCase()) && !level1Hits.includes(word)) {
        level1Hits.push(word)
      }
    }

    // 二级匹配
    for (const word of Object.keys(LEVEL2_WORDS)) {
      if (cleaned.includes(word.toLowerCase())) {
        level2Hits.push(word)
      }
    }

    // 三级匹配
    for (const word of Object.keys(LEVEL3_WORDS)) {
      if (cleaned.includes(word.toLowerCase())) {
        level3Hits.push(word)
      }
    }

    // 确定 blockReason（取最高优先级）
    let blockReason: BlockReasonType | null = null
    if (level1Hits.length > 0) {
      blockReason = this.classifyWord(level1Hits[0])
    } else if (level2Hits.length > 0) {
      blockReason = LEVEL2_WORDS[level2Hits[0]]
    }

    return {
      passed: level1Hits.length === 0,
      level1Hits: [...new Set(level1Hits)],
      level2Hits: [...new Set(level2Hits)],
      level3Hits: [...new Set(level3Hits)],
      blockReason,
      needManualReview: level3Hits.length > 0,
    }
  }

  /**
   * 对 AI 输出执行完整安全流程：
   * - 一级命中 → 返回"内容优化中"
   * - 二级命中 → 清除敏感词后返回清洗文本
   * - 三级命中 → 返回原文 + 标记 needsReview
   * - 全部写入 ContentSafetyAudit
   */
  async filterAndAudit(
    originalContent: string,
    aiCallLogId: number,
  ): Promise<{
    /** 是否可展示 */
    canDisplay: boolean
    /** 清洗后内容（canDisplay=true 时有效） */
    sanitizedContent: string
    /** 拦截原因（前端可展示给用户） */
    blockMessage: string
    /** 是否需要人工复核 */
    needsReview: boolean
  }> {
    const result = this.checkWithLevels(originalContent)

    // 一级命中 → 拦截
    if (!result.passed) {
      await this.saveAudit(originalContent, aiCallLogId, SafetyAuditResult.BLOCK, result)
      return {
        canDisplay: false,
        sanitizedContent: '',
        blockMessage: '内容优化中',
        needsReview: false,
      }
    }

    // 二级命中 → 清洗
    let sanitized = originalContent
    if (result.level2Hits.length > 0) {
      for (const word of result.level2Hits) {
        sanitized = sanitized.replace(new RegExp(word, 'g'), '***')
      }
      await this.saveAudit(originalContent, aiCallLogId, SafetyAuditResult.MANUAL_REVIEW, result)
      return {
        canDisplay: true,
        sanitizedContent: sanitized,
        blockMessage: '',
        needsReview: false,
      }
    }

    // 三级命中 → 标记复核
    if (result.level3Hits.length > 0) {
      await this.saveAudit(originalContent, aiCallLogId, SafetyAuditResult.MANUAL_REVIEW, result)
      return {
        canDisplay: true,
        sanitizedContent: originalContent,
        blockMessage: '',
        needsReview: true,
      }
    }

    // 完全通过
    await this.saveAudit(originalContent, aiCallLogId, SafetyAuditResult.PASS, result)
    return {
      canDisplay: true,
      sanitizedContent: originalContent,
      blockMessage: '',
      needsReview: false,
    }
  }

  // ==================== 原有方法（保持兼容） ====================

  /** 检查文本是否命中敏感词（保持兼容旧调用） */
  checkText(text: string): SafetyHitResult {
    if (!text) return { passed: true, hitWords: [], blockReason: null }

    const hitWords: string[] = []
    const lowerText = text.toLowerCase().replace(/\s+/g, '')

    for (const word of ALL_SENSITIVE_WORDS) {
      if (lowerText.includes(word.toLowerCase())) {
        hitWords.push(word)
      }
    }

    if (hitWords.length === 0) {
      return { passed: true, hitWords: [], blockReason: null }
    }

    const blockReason = this.classifyHits(hitWords)
    return { passed: false, hitWords, blockReason }
  }

  async checkAndAudit(
    originalContent: string,
    aiCallLogId: number,
  ): Promise<{ passed: boolean; audit: ContentSafetyAudit }> {
    const result = this.checkText(originalContent)

    const audit = this.auditRepo.create({
      aiCallLogId,
      originalContent,
      hitWords: result.hitWords.length > 0 ? JSON.stringify(result.hitWords) : null,
      result: result.passed ? SafetyAuditResult.PASS : SafetyAuditResult.BLOCK,
      blockReason: result.blockReason,
      detail: result.passed ? '安全' : `命中敏感词: ${result.hitWords.join('、')}`,
    })

    await this.auditRepo.save(audit)

    if (!result.passed) {
      this.logger.warn(
        `[AI Safety] BLOCKED aiCallLogId=${aiCallLogId} reason=${result.blockReason} words=${result.hitWords.join(',')}`,
      )
    }

    return { passed: result.passed, audit }
  }

  async incrementDailyViolation(userId: number, maxDailyViolations = 3): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    const key = `${DAILY_VIOLATION_KEY}${userId}:${today}`

    const count = await this.redis.incr(key)
    if (count === 1) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const ttl = Math.ceil((tomorrow.getTime() - Date.now()) / 1000)
      await this.redis.expire(key, ttl)
    }

    this.logger.warn(`[AI Safety] User ${userId} daily violation count=${count}`)
    return count > maxDailyViolations
  }

  checkTexts(texts: string[]): SafetyHitResult[] {
    return texts.map((text) => this.checkText(text))
  }

  // ==================== 私有方法 ====================

  private classifyWord(word: string): BlockReasonType {
    if (ALL_LEVEL1[word]) return ALL_LEVEL1[word]
    if (LEVEL1_WORDS[word]) return LEVEL1_WORDS[word]
    if (LEVEL2_WORDS[word]) return BlockReasonType.OTHER
    if (LEVEL3_WORDS[word]) return BlockReasonType.FRAUD
    return BlockReasonType.OTHER
  }

  private classifyHits(hitWords: string[]): BlockReasonType | null {
    for (const word of hitWords) {
      if (ALL_LEVEL1[word]) return ALL_LEVEL1[word]
      if (LEVEL1_WORDS[word]) return LEVEL1_WORDS[word]
      if (LEVEL2_WORDS[word]) return LEVEL2_WORDS[word]
      if (LEVEL3_WORDS[word]) return LEVEL3_WORDS[word]
    }
    return BlockReasonType.OTHER
  }

  private async saveAudit(
    content: string,
    aiCallLogId: number,
    result: SafetyAuditResult,
    tieredResult: TieredSafetyResult,
  ): Promise<void> {
    const allHits = [
      ...tieredResult.level1Hits,
      ...tieredResult.level2Hits,
      ...tieredResult.level3Hits,
    ]

    const audit = this.auditRepo.create({
      aiCallLogId,
      originalContent: content,
      hitWords: allHits.length > 0 ? JSON.stringify(allHits) : null,
      result,
      blockReason: tieredResult.blockReason,
      detail: result === SafetyAuditResult.PASS
        ? '安全'
        : [
            tieredResult.level1Hits.length > 0 ? `一级拦截: ${tieredResult.level1Hits.join(',')}` : '',
            tieredResult.level2Hits.length > 0 ? `二级替换: ${tieredResult.level2Hits.join(',')}` : '',
            tieredResult.level3Hits.length > 0 ? `三级标记: ${tieredResult.level3Hits.join(',')}` : '',
          ].filter(Boolean).join('; '),
    })

    await this.auditRepo.save(audit)

    if (result !== SafetyAuditResult.PASS) {
      this.logger.warn(
        `[AI Safety] aiCallLogId=${aiCallLogId} result=${result} L1=${tieredResult.level1Hits.length} L2=${tieredResult.level2Hits.length} L3=${tieredResult.level3Hits.length}`,
      )
    }
  }
}

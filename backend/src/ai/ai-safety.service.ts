import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RedisService } from '../common/redis.service'
import { ContentSafetyAudit, SafetyAuditResult, BlockReasonType } from '../entities/ContentSafetyAudit'

/**
 * AI 内容安全过滤服务
 *
 * 职责：
 * 1. 敏感词/违规短语匹配（词库 + 正则模式）
 * 2. 命中后写入 ContentSafetyAudit 表
 * 3. 每日累计违规次数追踪（Redis）
 * 4. 为其他 AI Service 提供统一的过滤入口
 */

/** 敏感词类别 */
export interface SafetyHitResult {
  /** 是否通过检查 */
  passed: boolean
  /** 命中的敏感词列表 */
  hitWords: string[]
  /** 违规类别 */
  blockReason: BlockReasonType | null
}

/** 每日违规限次 Redis key 前缀 */
const DAILY_VIOLATION_KEY = 'ai:safety:daily:'

// ===== 敏感词库 =====

/** 色情低俗 / 性暗示 */
const PORNOGRAPHY_WORDS = [
  '约炮', '一夜情', '裸聊', '开房', '上床', '啪啪', '炮友',
  '包养', '外围', '援交', '卖淫', '嫖娼', '色情', 'AV',
  '巨乳', '翘臀', '大胸', '胸大', '身材好想', '性感身材',
  '床上', '做爱', '性爱', '性交', '口交', '肛交',
  'SM', 'BDSM', '调教', '奴隶', '主人',
  '寂寞难耐', '欲火', '饥渴', '想要你', '想要我',
  '私密照', '裸照', '不穿衣服', '脱衣服',
]

/** 性骚扰 / 性暗示诱导 */
const HARASSMENT_WORDS = [
  '睡一晚', '陪我一晚', '晚上有空吗', '来我家坐坐', '我家没人',
  '你身材真好', '穿这么少', '床上功夫', '床上技术',
  '想不想试试', '给你看个好东西', '你懂得',
  '处男', '处女', '第一次', '初夜',
  '成人', '情趣', '酒店见', '约吗',
  '深度交流', '私下交流', '单独聊聊', '深夜聊聊',
  '洗干净', '等我', '穿上丝袜', '黑丝',
]

/** 诈骗诱导 */
const FRAUD_WORDS = [
  '投资理财', '稳赚不赔', '高回报', '内幕消息', '导师带单',
  '博彩', '赌博', '彩票', '下注', '赔率',
  '刷单返利', '刷信誉', '兼职打字员', '在家兼职',
  '转账给我', '转我', '借款', '借钱', '周转一下',
  '人民币', '加密货币', '比特币', 'USDT', '火币',
  '平台漏洞', '套利', '搬砖', '资金盘',
]

/** 人身攻击 / 侮辱 */
const ATTACK_WORDS = [
  '傻逼', '脑残', '废物', '垃圾', '去死',
  '丑八怪', '矮冬瓜', '肥猪', '胖子',
  '穷鬼', '屌丝', 'loser',
]

/** 所有敏感词合集（小写索引） */
const ALL_SENSITIVE_WORDS = [
  ...PORNOGRAPHY_WORDS,
  ...HARASSMENT_WORDS,
  ...FRAUD_WORDS,
  ...ATTACK_WORDS,
]

@Injectable()
export class AiSafetyService {
  private readonly logger = new Logger(AiSafetyService.name)

  constructor(
    @InjectRepository(ContentSafetyAudit)
    private readonly auditRepo: Repository<ContentSafetyAudit>,
    private readonly redis: RedisService,
  ) {}

  /**
   * 检查文本是否命中敏感词
   * @param text 待检查文本
   * @returns SafetyHitResult
   */
  checkText(text: string): SafetyHitResult {
    if (!text) return { passed: true, hitWords: [], blockReason: null }

    const hitWords: string[] = []
    const lowerText = text.toLowerCase().replace(/\s+/g, '')

    for (const word of ALL_SENSITIVE_WORDS) {
      const lowerWord = word.toLowerCase()
      if (lowerText.includes(lowerWord)) {
        hitWords.push(word)
      }
    }

    if (hitWords.length === 0) {
      return { passed: true, hitWords: [], blockReason: null }
    }

    // 分类判断违规类别
    const blockReason = this.classifyHits(hitWords)

    return { passed: false, hitWords, blockReason }
  }

  /**
   * 检查并写入审计记录
   * @returns 通过=true / 拦截=false
   */
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

  /**
   * 记录用户每日违规次数，达到阈值返回 true（需禁用功能）
   * @param userId 用户ID
   * @param maxDailyViolations 每日最大违规次数（默认3）
   */
  async incrementDailyViolation(userId: number, maxDailyViolations = 3): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    const key = `${DAILY_VIOLATION_KEY}${userId}:${today}`

    const count = await this.redis.incr(key)
    // 首次设置过期（次日凌晨）
    if (count === 1) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const ttl = Math.ceil((tomorrow.getTime() - Date.now()) / 1000)
      await this.redis.expire(key, ttl)
    }

    this.logger.warn(
      `[AI Safety] User ${userId} daily violation count=${count}`,
    )

    return count > maxDailyViolations
  }

  /**
   * 批量检查多条文本
   * @param texts 文本数组
   * @returns 通过检查的索引列表 + 各文本的命中结果
   */
  checkTexts(texts: string[]): { passed: boolean; hitWords: string[]; blockReason: BlockReasonType | null }[] {
    return texts.map((text) => this.checkText(text))
  }

  // ==================== 私有方法 ====================

  private classifyHits(hitWords: string[]): BlockReasonType | null {
    for (const word of hitWords) {
      if (PORNOGRAPHY_WORDS.includes(word)) return BlockReasonType.PORNOGRAPHY
      if (HARASSMENT_WORDS.includes(word)) return BlockReasonType.HARASSMENT
      if (FRAUD_WORDS.includes(word)) return BlockReasonType.FRAUD
      if (ATTACK_WORDS.includes(word)) return BlockReasonType.ATTACK
    }
    return BlockReasonType.OTHER
  }
}

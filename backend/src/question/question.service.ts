import { Injectable, NotFoundException, ForbiddenException, Optional, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, In } from 'typeorm'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { HotQuestion } from '../entities/HotQuestion'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { User } from '../entities/User'
import { AnswerLike } from '../entities/AnswerLike'
import { AuditLog } from '../entities/AuditLog'
import { DynamicService } from '../dynamic/dynamic.service'
import { AuditService } from '../audit/audit.service'
import { SystemService } from '../system/system.service'
import { RedisService } from '../common/redis.service'
import { NotifyChannelService } from '../admin/notify-channel.service'
import { SensitiveWordFilter } from '../common/sensitive-word.filter'

/** 答案状态 */
export const ANSWER_STATUS = {
  PENDING: 0,
  ACTIVE: 1,
  REJECTED: 2,
} as const

/** 限流：每分钟最多 10 次问答提交 */
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_SEC = 60

export interface QuestionListResult {
  list: HotQuestion[]
  total: number
  page: number
  limit: number
}

export interface QuestionDetailResult {
  id: number
  title: string
  content: string
  answerCount: number
  answers: any[]
}

export interface HotQuestionWithAvatars {
  id: number
  title: string
  answerCount: number
  avatarList: string[]
}

@Injectable()
export class QuestionService implements OnModuleInit {
  constructor(
    @InjectRepository(HotQuestion)
    private readonly questionRepository: Repository<HotQuestion>,
    @InjectRepository(QuestionAnswer)
    private readonly answerRepository: Repository<QuestionAnswer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AnswerLike)
    private readonly answerLikeRepository: Repository<AnswerLike>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dynamicService: DynamicService,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly auditService?: AuditService,
    @Optional()
    private readonly systemService?: SystemService,
    @Optional()
    private readonly redisService?: RedisService,
    @Optional()
    private readonly notifyChannelService?: NotifyChannelService,
  ) {}

  /** DFA 敏感词过滤器（Trie 树多模式匹配，O(N) 复杂度） */
  private sensitiveFilter = new SensitiveWordFilter()

  async onModuleInit() {
    await this.loadSensitiveWords()
  }

  /** 加载敏感词库（本地 config/sensitive-words/ 目录） */
  private async loadSensitiveWords(): Promise<void> {
    try {
      const candidateDirs = [
        resolve(process.cwd(), 'config/sensitive-words'),
        resolve(__dirname, '../../../config/sensitive-words'),
        resolve(__dirname, '../../../../config/sensitive-words'),
      ]
      const wordsDir = candidateDirs.find(dir => existsSync(dir))
      if (wordsDir) {
        const txtFiles = readdirSync(wordsDir).filter(f => f.endsWith('.txt'))
        if (txtFiles.length > 0) {
          const wordSet = new Set<string>()
          for (const file of txtFiles) {
            try {
              const raw = readFileSync(resolve(wordsDir, file), 'utf-8')
              raw.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .forEach(word => wordSet.add(word))
            } catch { /* 单个文件读取失败跳过 */ }
          }
          if (wordSet.size > 0) {
            this.sensitiveFilter.build(Array.from(wordSet))
            console.log(`[QuestionService] 敏感词库加载完成，共 ${wordSet.size} 个词，DFA 已构建`)
            return
          }
        }
      }
    } catch (e: any) {
      console.warn('[QuestionService] 敏感词库加载失败，使用硬编码兜底:', e?.message)
    }
    // 兜底：硬编码基础词库
    this.sensitiveFilter.build([
      '傻逼', '傻B', '煞笔', '尼玛', '你妈', 'cnm', '操你', '去死',
      '赌博', '博彩', '赌场', '下注', '裸聊', '约炮', '嫖娼', '色情',
      '毒品', '冰毒', '枪支', '假钞', '洗钱', '诈骗', '传销',
      '加微信', '加我微信', '微商', '刷单',
    ])
    console.log('[QuestionService] 使用硬编码敏感词库兜底')
  }

  async getQuestions(page: number = 1, limit: number = 20, userId?: number | null): Promise<QuestionListResult> {
    const skip = (page - 1) * limit

    const [questions, total] = await this.questionRepository.findAndCount({
      where: { isActive: 1 },
      order: { sortOrder: 'DESC', createdAt: 'DESC' },
      skip,
      take: limit,
    })

    // 如果用户已登录，查询哪些问题已被该用户回答
    let answeredIds: Set<number> = new Set()
    if (userId) {
      const questionIds = questions.map(q => q.id)
      if (questionIds.length > 0) {
        const answers = await this.answerRepository.find({
          where: { questionId: In(questionIds), userId },
          select: ['questionId'],
        })
        answeredIds = new Set(answers.map(a => a.questionId))
      }
    }

    const list = questions.map(q => ({
      ...q,
      isAnsweredByUser: answeredIds.has(q.id),
    }))

    return {
      list: list as any,
      total,
      page,
      limit,
    }
  }

  async getHotQuestionsForHome(): Promise<HotQuestionWithAvatars[]> {
    // 获取置顶的热门问题（最多3个）
    const questions = await this.questionRepository.find({
      where: { isActive: 1 },
      order: { sortOrder: 'DESC', answerCount: 'DESC' },
      take: 3,
    })

    if (questions.length === 0) return []

    // 批量查询每个问题的回答用户头像
    const result: HotQuestionWithAvatars[] = []
    for (const q of questions) {
      const answers = await this.answerRepository.find({
        where: { questionId: q.id, status: 1 },
        relations: ['user'],
        order: { likeCount: 'DESC' },
        take: 3,
      })
      const avatarList = answers
        .map((a) => a.user?.avatar || '')
        .filter((url) => url && url.length > 0)
      result.push({
        id: q.id,
        title: q.title,
        answerCount: q.answerCount,
        avatarList,
      })
    }
    return result
  }

  async getQuestionDetail(id: number, page: number = 1, limit: number = 20): Promise<QuestionDetailResult> {
    const question = await this.questionRepository.findOne({
      where: { id, isActive: 1 },
    })

    if (!question) {
      throw new NotFoundException('问题不存在')
    }

    const skip = (page - 1) * limit

    const [answers, total] = await this.answerRepository.findAndCount({
      where: {
        questionId: id,
        status: 1,
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    })

    const formattedAnswers = answers.map(answer => ({
      id: answer.id,
      questionId: answer.questionId,
      userId: answer.userId,
      content: answer.content,
      photos: answer.photos || [],
      likeCount: answer.likeCount,
      createdAt: answer.createdAt,
      user: answer.user ? {
        nickname: answer.user.nickname,
        avatar: answer.user.avatar,
        age: answer.user.age,
        height: answer.user.height,
        weight: answer.user.weight,
        education: answer.user.education,
        incomeRange: answer.user.incomeRange,
      } : null,
    }))

    return {
      id: question.id,
      title: question.title,
      content: question.content,
      answerCount: total,
      answers: formattedAnswers,
    }
  }

  async createAnswer(questionId: number, userId: number, content: string, photos: string[] = []): Promise<QuestionAnswer> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId, isActive: 1 },
    })

    if (!question) {
      throw new NotFoundException('问题不存在')
    }

    // ===== 修改点 B：限流检查（审核之前） =====
    if (this.redisService) {
      const rateLimitKey = `rate_limit:question:user_${userId}`
      let currentCount: number
      try {
        currentCount = await this.redisService.incr(rateLimitKey)
        if (currentCount === 1) {
          await this.redisService.expire(rateLimitKey, RATE_LIMIT_WINDOW_SEC)
        }
        if (currentCount > RATE_LIMIT_MAX) {
          throw new ForbiddenException('提交太频繁，请稍后再试')
        }
      } catch (e) {
        if (e instanceof ForbiddenException) throw e
        console.error('Redis 限流检查失败，降级放行:', e)
      }
    }

    // ===== 修改点 B：内容审核 =====
    let answerStatus: number = ANSWER_STATUS.ACTIVE // 默认正常

    if (content && content.trim()) {
      const auditResult = await this.auditAnswerContent(userId, content)
      if (auditResult === 'reject') {
        throw new ForbiddenException('回答包含违规内容，请修改后重试')
      }
      if (auditResult === 'review') {
        answerStatus = ANSWER_STATUS.PENDING
      }
    }

    // 使用 insert 确保所有字段（含 userId）写入数据库
    const insertResult = await this.answerRepository.insert({
      questionId,
      userId,
      content,
      photos,
      status: answerStatus,
      likeCount: 0,
    } as any)

    const answerId = insertResult.identifiers[0]?.id
    if (!answerId) {
      throw new Error('回答创建失败')
    }

    await this.questionRepository.update(
      { id: questionId },
      { answerCount: question.answerCount + 1 },
    )

    // 创建审核记录
    const auditLog = this.auditLogRepository.create({
      action: answerStatus === ANSWER_STATUS.PENDING ? 'PENDING' : 'PASS',
      targetType: 'answer',
      targetId: answerId,
      submitterId: userId,
      content: (content || '').substring(0, 200),
    })
    await this.auditLogRepository.save(auditLog)

    // 审核中的答案不自动生成动态（审核通过后由管理员操作触发）
    // ACTIVE 状态的答案才自动生成动态
    if (answerStatus === ANSWER_STATUS.ACTIVE) {
      const answerRecord = await this.answerRepository.findOne({ where: { id: answerId } })
      if (answerRecord) {
        this.dynamicService.autoCreateDynamic({
          userId,
          type: 'answer',
          content: answerRecord.content,
          images: answerRecord.photos || [],
          referenceId: answerRecord.id,
          questionId,
          questionTitle: question.title,
        }).catch(() => {})
      }
    }

    // 如果进入人工审核，通知 webhook
    if (answerStatus === ANSWER_STATUS.PENDING) {
      const user = await this.userRepository.findOne({ where: { id: userId }, select: ['nickname'] })
      this.notifyChannelService?.sendAuditNotify({
        type: 'answer',
        userId,
        userNickname: user?.nickname || '',
        content: `问题：${question.title}\n回答内容：${content.substring(0, 100)}`,
      }).catch((e) => {
        console.error('[QuestionService] 发送审核通知失败:', e.message)
      })
    }

    return this.answerRepository.findOneOrFail({ where: { id: answerId } })
  }

  async likeAnswer(answerId: number, userId: number): Promise<{ liked: boolean; likeCount: number }> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const answer = await queryRunner.manager.findOne(QuestionAnswer, {
        where: { id: answerId },
        lock: { mode: 'pessimistic_write' },
      })

      if (!answer) {
        throw new NotFoundException('回答不存在')
      }

      const existingLike = await queryRunner.manager.findOne(AnswerLike, {
        where: { answerId, userId },
      })

      let liked = false

      if (existingLike) {
        await queryRunner.manager.remove(existingLike)
        await queryRunner.manager.update(
          QuestionAnswer,
          { id: answerId },
          { likeCount: () => 'likeCount - 1' },
        )
        liked = false
      } else {
        const newLike = this.answerLikeRepository.create({ answerId, userId })
        await queryRunner.manager.save(newLike)
        await queryRunner.manager.update(
          QuestionAnswer,
          { id: answerId },
          { likeCount: () => 'likeCount + 1' },
        )
        liked = true
      }

      await queryRunner.commitTransaction()

      const updatedAnswer = await this.answerRepository.findOne({
        where: { id: answerId },
      })

      return {
        liked,
        likeCount: updatedAnswer?.likeCount || 0,
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  // ===== 修改点 C：用户查看自己的回答（含 PENDING/REJECTED 状态） =====
  async getUserAnswers(userId: number, page: number = 1, limit: number = 20): Promise<{ list: any[]; total: number }> {
    const skip = (page - 1) * limit

    const [answers, total] = await this.answerRepository.findAndCount({
      where: { userId },
      relations: ['user', 'question'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    })

    const list = answers.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      questionTitle: (a.question as any)?.title || '',
      userId: a.userId,
      content: a.content,
      photos: a.photos || [],
      likeCount: a.likeCount,
      status: a.status,
      statusText: a.status === ANSWER_STATUS.PENDING ? '审核中' : a.status === ANSWER_STATUS.REJECTED ? '未通过审核' : '已通过',
      createdAt: a.createdAt,
    }))

    return { list, total }
  }

  // ===== 修改点 B：内容审核方法 =====
  /**
   * 审核回答内容
   * - AI 审核启用时，调用腾讯云审核
   * - AI 审核未启用时，本地敏感词过滤
   * - 返回 'pass' | 'reject' | 'review'
   */
  private async auditAnswerContent(userId: number, content: string): Promise<'pass' | 'reject' | 'review'> {
    const aiEnabled = await this.getConfigValue('audit.aiEnabled')

    if (aiEnabled === '1' || aiEnabled === 'true') {
      if (!this.auditService) {
        return this.checkLocalBannedContent(content)
      }
      try {
        const auditResult = await this.auditService.auditText({
          text: content,
          type: 'answer' as any,
          userId,
        })
        return auditResult.result as 'pass' | 'reject' | 'review'
      } catch (e) {
        console.error('腾讯云审核调用失败，降级为本地敏感词过滤:', e)
        return this.checkLocalBannedContent(content)
      }
    }

    // 本地敏感词过滤
    return this.checkLocalBannedContent(content)
  }

  /**
   * 本地敏感词检查（使用 DFA Trie 树 51K+ 词库）
   * - 命中：直接拒绝
   * - 未命中：进入待审核状态
   */
  private checkLocalBannedContent(content: string): 'pass' | 'reject' | 'review' {
    const hit = this.sensitiveFilter.check(content)
    if (hit) {
      console.log(`[QuestionService] 敏感词命中: ${hit}`)
      return 'reject'
    }
    return 'review'
  }

  /**
   * 从 SystemConfig 读取配置值
   */
  private async getConfigValue(key: string): Promise<string | null> {
    if (!this.systemService) return null
    try {
      return await this.systemService.getConfig(key)
    } catch {
      return null
    }
  }
}

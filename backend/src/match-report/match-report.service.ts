import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as QRCode from 'qrcode'
import { MatchAnalysisReport } from '../entities/MatchAnalysisReport'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { UserTagSelection } from '../entities/UserTagSelection'
import { SystemService } from '../system/system.service'
import { WechatQrService } from '../personality-test/wechat-qr.service'
import {
  Radar,
  buildProfileTags,
  flattenPersonalityTags,
  scoreHealth,
  buildRadar,
  buildSuggestions,
  parseAgeRange,
  parseHeightMin,
} from './match-report.rule-engine'

/** 报告快照结构（存库 reportJson，不包含 qrCode —— 二维码每次读取时按最新配置重新生成） */
export interface ReportSnapshot {
  tags: string[]
  healthScore: number
  healthLevel: string
  healthAdvice: string[]
  matchingPool: { mode: 'real' | 'fixed'; count: number; text: string }
  top3: Array<{ nickname: string; avatar: string; tags: string[] }>
  suggestions: string[]
  radar: Radar
}

export interface ReportConfig {
  enabled: boolean
  quotaTotal: number
  poolMode: 'real' | 'fixed'
  poolFixedText: string
  shareText: string
  h5ReportUrl: string
}

const DEFAULT_POOL_FIXED_TEXT = '平台汇聚大量优质单身会员，快来完善资料解锁更多专属推荐'
const DEFAULT_SHARE_TEXT = '我的匹配分析报告已生成，快来看看你的缘分指数'

@Injectable()
export class MatchReportService {
  private readonly logger = new Logger(MatchReportService.name)

  constructor(
    @InjectRepository(MatchAnalysisReport)
    private readonly reportRepo: Repository<MatchAnalysisReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepo: Repository<UserPhoto>,
    @InjectRepository(UserTagSelection)
    private readonly tagSelectionRepo: Repository<UserTagSelection>,
    private readonly systemService: SystemService,
    private readonly wechatQrService: WechatQrService,
  ) {}

  /** 读取报告相关配置（含默认值） */
  async getConfig(): Promise<ReportConfig> {
    const enabledStr = await this.systemService.getConfig('matchReport.enabled')
    const quotaStr = await this.systemService.getConfig('matchReport.quotaTotal')
    const poolMode = (await this.systemService.getConfig('matchReport.poolMode')) || 'real'
    const poolFixedText = (await this.systemService.getConfig('matchReport.poolFixedText')) || DEFAULT_POOL_FIXED_TEXT
    const shareText = (await this.systemService.getConfig('matchReport.shareText')) || DEFAULT_SHARE_TEXT
    const h5ReportUrl = (await this.systemService.getConfig('matchReport.h5ReportUrl')) || ''

    // 名额总数：未配置/空串/非法值回退默认 100；配置为 0 时保持 0（即“名额已满”），
    // 不能用 `parseInt(...) || 100` 否则会把 0 错误兜底成 100。
    let quotaTotal = 100
    if (quotaStr !== null && quotaStr !== undefined && quotaStr.trim() !== '') {
      const parsed = parseInt(quotaStr, 10)
      if (Number.isFinite(parsed) && parsed >= 0) {
        quotaTotal = parsed
      }
    }

    return {
      enabled: enabledStr === null ? true : (enabledStr !== 'false' && enabledStr !== '0'),
      quotaTotal,
      poolMode: poolMode === 'fixed' ? 'fixed' : 'real',
      poolFixedText,
      shareText,
      h5ReportUrl,
    }
  }

  /** 生成 H5 报告页二维码（data URL）；未配置 h5ReportUrl 时返回空串 */
  private async generateQrCode(config: ReportConfig): Promise<string> {
    if (!config.h5ReportUrl) return ''
    try {
      return await QRCode.toDataURL(config.h5ReportUrl, { width: 240, margin: 1 })
    } catch (e: any) {
      this.logger.warn(`[MatchReport] 生成二维码失败: ${e?.message}`)
      return ''
    }
  }

  /** 生成小程序报告页小程序码（data URL）；未配置微信凭据或生成失败时返回空串 */
  private async generateMiniQrCode(reportId: number): Promise<string> {
    try {
      const buffer = await this.wechatQrService.getMiniProgramCode(
        `r=${reportId}`,
        'pages/match-report/index',
      )
      if (!buffer) return ''
      return `data:image/png;base64,${buffer.toString('base64')}`
    } catch (e: any) {
      this.logger.warn(`[MatchReport] 生成小程序码失败: ${e?.message}`)
      return ''
    }
  }

  /** 查询当前用户的报告入口状态（用于按钮显隐/置灰） */
  async getStatus(userId: number) {
    const config = await this.getConfig()
    const quotaUsed = await this.reportRepo.count()
    const existing = await this.reportRepo.findOne({ where: { userId } })
    return {
      enabled: config.enabled,
      quotaTotal: config.quotaTotal,
      quotaUsed,
      hasReport: !!existing,
    }
  }

  /** 获取当前用户已生成的报告；未生成返回 null */
  async getMyReport(userId: number) {
    const existing = await this.reportRepo.findOne({ where: { userId } })
    if (!existing) return null

    const config = await this.getConfig()
    const snapshot = this.parseSnapshot(existing.reportJson)
    return this.toResponse(existing, snapshot, await this.generateQrCode(config), config.shareText, await this.generateMiniQrCode(existing.id))
  }

  /** 生成（或返回已存在的）匹配分析报告 */
  async generate(userId: number) {
    const config = await this.getConfig()
    if (!config.enabled) {
      throw new ForbiddenException('匹配分析报告功能已关闭')
    }

    // 已生成过 → 直接返回快照，不重复消耗名额
    const existing = await this.reportRepo.findOne({ where: { userId } })
    if (existing) {
      const snapshot = this.parseSnapshot(existing.reportJson)
      return this.toResponse(existing, snapshot, await this.generateQrCode(config), config.shareText, await this.generateMiniQrCode(existing.id))
    }

    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    const snapshot = await this.buildSnapshot(user, config)

    // 事务：名额计数 + 写入，保证“前 N 名免费”在并发下尽量准确；userId 唯一索引兜底重复生成
    const saved = await this.reportRepo.manager.transaction(async (manager) => {
      const dup = await manager.findOne(MatchAnalysisReport, { where: { userId } })
      if (dup) return dup

      const count = await manager.count(MatchAnalysisReport)
      if (count >= config.quotaTotal) {
        throw new ForbiddenException('名额已满')
      }

      const entity = manager.create(MatchAnalysisReport, {
        userId,
        quotaNo: count + 1,
        reportJson: JSON.stringify(snapshot),
      })
      return manager.save(MatchAnalysisReport, entity)
    })

    return this.toResponse(saved, snapshot, await this.generateQrCode(config), config.shareText, await this.generateMiniQrCode(saved.id))
  }

  /** 组装报告快照（纯计算 + 匹配池/Top3 查询） */
  private async buildSnapshot(user: User, config: ReportConfig): Promise<ReportSnapshot> {
    const [photoCount, tagNames] = await Promise.all([
      this.photoRepo.count({ where: { userId: user.id } }),
      this.loadSelectedTagNames(user.id),
    ])

    const tags = buildProfileTags(user, tagNames)
    const health = scoreHealth(user)
    const radar = buildRadar(user, photoCount)
    const suggestions = buildSuggestions(user, photoCount, tagNames.length)
    const matchingPool = await this.buildMatchingPool(user, config)
    const top3 = await this.buildTop3(user)

    return {
      tags,
      healthScore: health.score,
      healthLevel: health.level,
      healthAdvice: health.advice,
      matchingPool,
      top3,
      suggestions,
      radar,
    }
  }

  /** 用户选中的系统标签名称 */
  private async loadSelectedTagNames(userId: number): Promise<string[]> {
    const selections = await this.tagSelectionRepo.find({
      where: { userId, isSelected: 1, isDeleted: 0 },
      relations: ['tag'],
    })
    return selections
      .map((s) => s.tag?.name)
      .filter((name): name is string => !!name && name.trim().length > 0)
  }

  /** 匹配池实况：real=实时统计符合条件的异性数量；fixed=返回固定文案 */
  private async buildMatchingPool(
    user: User,
    config: ReportConfig,
  ): Promise<ReportSnapshot['matchingPool']> {
    if (config.poolMode === 'fixed') {
      return { mode: 'fixed', count: 0, text: config.poolFixedText }
    }

    const qb = this.buildOppositePoolQb(user)
    const count = await qb.getCount()
    return {
      mode: 'real',
      count,
      text: count > 0 ? `${count} 位符合你择偶要求的异性` : '暂未匹配到符合要求的异性，可适当放宽条件',
    }
  }

  /** TOP3 推荐（模糊展示：昵称首字 + 头像 + 部分标签） */
  private async buildTop3(user: User): Promise<ReportSnapshot['top3']> {
    const qb = this.buildOppositePoolQb(user)
    const candidates = await qb
      .orderBy('user.profileScore', 'DESC')
      .addOrderBy('user.lastActiveAt', 'DESC')
      .take(3)
      .getMany()

    return candidates.map((c) => ({
      nickname: this.maskNickname(c.nickname),
      avatar: c.avatar || '',
      tags: [...flattenPersonalityTags(c.personalityTags), ...(c.tags || [])].filter(Boolean).slice(0, 3),
    }))
  }

  /** 构建“符合条件的异性”查询（异性 + 未删除 + 排除自己 + 年龄/身高条件） */
  private buildOppositePoolQb(user: User) {
    const oppositeGender = user.gender === 1 ? 2 : user.gender === 2 ? 1 : 0

    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.isDeleted = 0')
      .andWhere('user.id != :selfId', { selfId: user.id })

    if (oppositeGender === 0) {
      // 性别未设置，无法确定“异性”，返回空结果
      qb.andWhere('1 = 0')
    } else {
      qb.andWhere('user.gender = :gender', { gender: oppositeGender })
    }

    const ageRange = parseAgeRange(user.partnerAgeRange)
    if (ageRange) {
      qb.andWhere('user.birthYear IS NOT NULL')
      if (ageRange.min !== null) {
        qb.andWhere('(YEAR(CURDATE()) - user.birthYear) >= :minAge', { minAge: ageRange.min })
      }
      if (ageRange.max !== null) {
        qb.andWhere('(YEAR(CURDATE()) - user.birthYear) <= :maxAge', { maxAge: ageRange.max })
      }
    }

    const heightMin = parseHeightMin(user.partnerHeightMin)
    if (heightMin !== null) {
      qb.andWhere('user.height >= :heightMin', { heightMin })
    }

    return qb
  }

  private maskNickname(nickname: string | null | undefined): string {
    if (!nickname) return '**'
    return `${nickname[0]}**`
  }

  private parseSnapshot(reportJson: string): ReportSnapshot {
    try {
      return JSON.parse(reportJson) as ReportSnapshot
    } catch {
      // 历史脏数据兜底，返回空报告结构
      return {
        tags: [],
        healthScore: 0,
        healthLevel: '待完善',
        healthAdvice: [],
        matchingPool: { mode: 'real', count: 0, text: '' },
        top3: [],
        suggestions: [],
        radar: {
          profileCompleteness: 0,
          attractiveness: 0,
          matchRange: 0,
          activity: 0,
          sincerity: 0,
        },
      }
    }
  }

  private toResponse(report: MatchAnalysisReport, snapshot: ReportSnapshot, qrCode: string, shareText: string, miniQrCode: string) {
    return {
      id: report.id,
      quotaNo: report.quotaNo,
      createdAt: report.createdAt,
      shareText,
      qrCode,
      miniQrCode,
      ...snapshot,
    }
  }
}

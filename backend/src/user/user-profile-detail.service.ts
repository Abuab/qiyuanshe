import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { Follow } from '../entities/Follow'
import { UserAuth } from '../entities/UserAuth'
import { UserTagSelection } from '../entities/UserTagSelection'
import { AiUserProfile, ProfileStatus } from '../entities/AiUserProfile'
import { AiMatchReport } from '../entities/AiMatchReport'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { SinglePromise } from '../entities/SinglePromise'
import { ProfileVisit } from '../entities/ProfileVisit'
import { AiConfigService } from '../ai/ai-config.service'
import { AiFeatureKey } from '../ai/types'
import { getDisplayName } from '../common/user-utils'
import { beijingISO } from '../common/utils/date-utils'
import {
  TopSection,
  BasicInfoSection,
  IdentityAuthSection,
  IdentityItem,
  AboutMeSection,
  TagItem,
  HopeTaSection,
  PartnerTag,
  InteractionSection,
  BottomBarSection,
  PhotoItem,
  PhotoGuidanceConfig,
  UserProfileDetailResponse,
  UserAnswerItem,
  MatchmakerReviewItem,
} from './user-profile-detail.types'

/**
 * 用户详情页完整数据拼装服务
 *
 * 对标竞品"飘飘"个人主页，按 7 个分区组装数据结构
 */
@Injectable()
export class UserProfileDetailService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepo: Repository<UserPhoto>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(UserAuth)
    private readonly authRepo: Repository<UserAuth>,
    @InjectRepository(UserTagSelection)
    private readonly tagSelectionRepo: Repository<UserTagSelection>,
    @InjectRepository(AiUserProfile)
    private readonly aiProfileRepo: Repository<AiUserProfile>,
    @InjectRepository(AiMatchReport)
    private readonly matchReportRepo: Repository<AiMatchReport>,
    @InjectRepository(QuestionAnswer)
    private readonly answerRepo: Repository<QuestionAnswer>,
    @InjectRepository(MatchmakerComment)
    private readonly matchmakerCommentRepo: Repository<MatchmakerComment>,
    @InjectRepository(SinglePromise)
    private readonly singlePromiseRepo: Repository<SinglePromise>,
    @InjectRepository(ProfileVisit)
    private readonly visitRepo: Repository<ProfileVisit>,
    private readonly aiConfigService: AiConfigService,
  ) {}

  /**
   * 获取用户详情页完整数据
   * @param userId 被查看的用户 ID
   * @param currentUserId 当前登录用户 ID（未登录为 null）
   */
  async getUserProfileDetail(
    userId: number,
    currentUserId?: number,
  ): Promise<UserProfileDetailResponse> {
    // 允许 NORMAL(1) 和 INCOMPLETE(2) 用户，排除 PENDING(0) 和 DISABLED(3)
    const user = await this.userRepo.findOne({
      where: { id: userId, isDeleted: 0 },
    })
    if (!user) throw new NotFoundException('用户不存在')
    // 待审核/已禁用的用户对他人不可见
    if (currentUserId !== userId && (user.status === 0 || user.status === 3)) {
      throw new NotFoundException('用户不存在')
    }

    const isSelf = currentUserId === userId

    // 记录来访（非本人查看时写入 profile_visits 表）
    if (currentUserId && !isSelf) {
      this.visitRepo.save(
        this.visitRepo.create({ userId, visitorUserId: currentUserId }),
      ).catch((err) => console.error('Record visit error:', err?.message || err))
    }

    // 并行加载各分区数据
    const [
      photos,
      followCount,
      followerCount,
      isFollowed,
      auths,
      tagSelections,
      aiProfile,
      hasMatchReport,
      answers,
      matchmakerComments,
      singlePromise,
    ] = await Promise.all([
      this.photoRepo.find({
        where: { userId },
        order: { sortOrder: 'ASC' },
      }),
      this.followRepo.count({ where: { userId } }),
      this.followRepo.count({ where: { targetUserId: userId } }),
      currentUserId && !isSelf
        ? this.followRepo.findOne({
            where: { userId: currentUserId, targetUserId: userId },
          }).then((f) => !!f)
        : Promise.resolve(false),
      this.authRepo.find({ where: { userId } }),
      this.tagSelectionRepo.find({
        where: { userId, isSelected: 1, isDeleted: 0 },
        relations: ['tag'],
      }),
      this.aiProfileRepo.findOne({
        where: { userId, status: ProfileStatus.NORMAL, isDeleted: 0 },
      }),
      currentUserId && !isSelf
        ? this.matchReportRepo.findOne({
            where: { userId: currentUserId, targetUserId: userId },
          }).then((r) => !!r)
        : Promise.resolve(false),
      this.answerRepo.find({
        where: { userId, status: 1 },
        relations: ['question'],
        order: { createdAt: 'ASC' },
      }),
      this.matchmakerCommentRepo.find({
        where: { userId, status: 1 },
        relations: ['matchmaker'],
        order: { createdAt: 'DESC' },
      }),
      this.singlePromiseRepo.findOne({
        where: { userId, status: 1 },
        order: { createdAt: 'DESC' },
      }),
    ])

    // AI 开关状态（决定是否展示入口）
    const aiMatchEnabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.MATCH)
    const aiFunQuizEnabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.FUN_QUIZ)
    const aiProfileGenEnabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.PROFILE_GEN)

    // 加载当前用户的照片数量（用于判断是否触发上传引导）
    let myPhotoCount = 0
    if (currentUserId && !isSelf) {
      myPhotoCount = await this.photoRepo.count({ where: { userId: currentUserId } })
    }

    // 照片引导文案配置
    const photoGuidance: PhotoGuidanceConfig = {
      loginPromptText: '登录后即可查看全部照片~',
      loginButtonText: '去登录',
      uploadPromptText: '上传你的照片，探索更多可能~',
      uploadButtonText: '上传照片',
      minPhotoThreshold: 1,
    }

    // 构建照片列表（含权限控制）
    const photoItems: PhotoItem[] = photos.slice(0, 10).map((p, i) => {
      const isFirst = i === 0
      const canView = !!currentUserId || isFirst
      return {
        url: p.photoUrl,
        isFirst,
        needLogin: !canView,
        isBlurred: !canView,
      }
    })

    // 已登录但照片不足时，自己的照片需要额外场景（对方非首张也需要模糊）
    const hasEnoughPhotos = !currentUserId || myPhotoCount > photoGuidance.minPhotoThreshold
    if (currentUserId && !isSelf && myPhotoCount <= photoGuidance.minPhotoThreshold) {
      for (const item of photoItems) {
        if (!item.isFirst) {
          item.needLogin = false
          item.isBlurred = true
        }
      }
    } else if (hasEnoughPhotos) {
      // 照片充足：全部清晰
      for (const item of photoItems) {
        item.isBlurred = false
      }
    }

    return {
      top: this.buildTop(user, photos, isSelf, !!isFollowed, followCount, followerCount),
      basicInfo: this.buildBasicInfo(user),
      identityAuth: this.buildIdentityAuth(auths, user, singlePromise),
      aboutMe: this.buildAboutMe(user, tagSelections, aiProfile),
      hopeTa: this.buildHopeTa(user),
      interaction: { giftCount: 0, canShare: true, shareTitle: `来看看${getDisplayName(user.nickname, user.userId)}的个人主页` },
      bottomBar: this.buildBottomBar(isSelf, false),
      showAiMatchEntry: !isSelf && aiMatchEnabled,
      showAiFunQuizEntry: !isSelf && aiFunQuizEnabled,
      showAiProfileGenEntry: isSelf && aiProfileGenEnabled,
      photos: photoItems,
      myPhotoCount,
      photoGuidance,
      loveQuote: user.loveQuote || '',
      answers: answers.map((a): UserAnswerItem => ({
        question: a.question?.title || '',
        answer: a.content || '',
      })),
      personalityTags: user.personalityTags,
      hopeTaTags: user.hopeTaTags,
      matchmakerReviews: matchmakerComments.map((c): MatchmakerReviewItem => ({
        matchmakerName: c.matchmaker?.name || '',
        matchmakerAvatar: c.matchmaker?.avatar || '',
        content: c.content,
        rating: c.rating,
        createdAt: c.createdAt ? beijingISO(c.createdAt) : '',
      })),
    }
  }

  // ==================== 分区构建 ====================

  private buildTop(
    user: User,
    photos: UserPhoto[],
    isSelf: boolean,
    isFollowed: boolean,
    followCount: number,
    followerCount: number,
  ): TopSection {
    const firstPhoto = photos[0]
    return {
      backgroundPhoto: firstPhoto?.photoUrl || user.avatar || '',
      avatar: user.avatar || '',
      nickname: user.nickname || '',
      displayName: user.nickname || (user.userId ? `昵称${user.userId}` : '用户'),
      userId: user.userId || '',
      isSelf,
      isFollowed,
      followCount,
      followerCount,
    }
  }

  private buildBasicInfo(user: User): BasicInfoSection {
    return {
      age: user.birthYear ? new Date().getFullYear() - user.birthYear : 0,
      height: user.height || 0,
      weight: user.weight || 0,
      education: user.education || '',
      birthDay: user.birthYear ? `${user.birthYear}年` : '',
      zodiac: user.zodiac || '',
      constellation: user.constellation || '',
      occupation: user.occupation || '',
      hometown: user.hometown || '',
      residence: user.residence || '',
    }
  }

  private buildIdentityAuth(
    auths: UserAuth[],
    user: User,
    singlePromise: SinglePromise | null,
  ): IdentityAuthSection {
    const authMap = new Map<string, UserAuth>()
    auths.forEach((a) => authMap.set(a.authType, a))

    const identityItems: IdentityItem[] = [
      {
        type: 'real_name',
        label: '实名',
        icon: 'id-card',
        verified: user.isRealName === 1,
      },
      {
        type: 'education',
        label: '学历',
        icon: 'education',
        verified: !!authMap.get('education')?.status && authMap.get('education')?.status === 1,
      },
      {
        type: 'house',
        label: '房',
        icon: 'house',
        verified: !!authMap.get('property')?.status && authMap.get('property')?.status === 1,
      },
      {
        type: 'car',
        label: '车',
        icon: 'car',
        verified: !!authMap.get('car')?.status && authMap.get('car')?.status === 1,
      },
      {
        type: 'single_pledge',
        label: '单身承诺',
        icon: 'promise',
        verified: singlePromise?.status === 1,
      },
      {
        type: 'marital',
        label: '婚况',
        icon: 'marital',
        verified: !!user.maritalStatus,
      },
    ]

    return {
      title: '身份认证',
      hint: '点亮的为已认证',
      items: identityItems,
    }
  }

  private buildAboutMe(
    user: User,
    tagSelections: any[],
    aiProfile: AiUserProfile | null,
  ): AboutMeSection {
    const tags: TagItem[] = tagSelections
      .filter((s) => s.tag && s.tag.isEnabled === 1)
      .map((s) => ({
        name: s.tag.name,
        category: s.tag.category,
        iconUrl: s.tag.iconUrl || '',
      }))

    // 补充用户资料中的标签（收入/住房/购车/婚况 作为展示标签）
    const extraTags: TagItem[] = []
    if (user.incomeRange) {
      const incomeName = user.incomeRange.startsWith('月收入') ? user.incomeRange : '月收入' + user.incomeRange
      extraTags.push({ name: incomeName, category: 'basic', iconUrl: '' })
    }
    if (user.housingStatus) extraTags.push({ name: user.housingStatus, category: 'basic', iconUrl: '' })
    if (user.carStatus) extraTags.push({ name: user.carStatus, category: 'basic', iconUrl: '' })
    if (user.maritalStatus) extraTags.push({ name: user.maritalStatus, category: 'basic', iconUrl: '' })
    if (user.whenMarry) extraTags.push({ name: user.whenMarry, category: 'basic', iconUrl: '' })
    if (user.onlyChild) {
      const onlyChildName = user.onlyChild === '是' ? '独生' : user.onlyChild === '否' ? '非独生' : user.onlyChild
      extraTags.push({ name: onlyChildName, category: 'basic', iconUrl: '' })
    }

    return {
      title: '关于我',
      tags: [...extraTags, ...tags],
      aiProfileText: aiProfile?.content || '',
      hasAiProfile: !!aiProfile,
    }
  }

  private buildHopeTa(user: User): HopeTaSection {
    const partnerTags: PartnerTag[] = []

    if (user.partnerAgeRange) partnerTags.push({ label: '年龄范围', value: user.partnerAgeRange })
    if (user.partnerHeightMin) {
      const rawHeight = user.partnerHeightMin.replace(/[cC][mM].*$/, '').replace(/以上$/, '')
      partnerTags.push({ label: '身高要求', value: `${rawHeight}cm以上` })
    }
    if (user.partnerEducation) partnerTags.push({ label: '学历要求', value: user.partnerEducation })
    if (user.partnerIncome) {
      const incomeVal = user.partnerIncome.startsWith('月收入') ? user.partnerIncome : `月收入${user.partnerIncome}`
      partnerTags.push({ label: '收入要求', value: incomeVal })
    }
    if (user.partnerMaritalStatus) partnerTags.push({ label: '婚况要求', value: user.partnerMaritalStatus })
    if (user.acceptChildren) partnerTags.push({ label: '子女情况', value: user.acceptChildren })

    return {
      title: 'Ta希望你',
      partnerTags,
      aiHopeText: user.mateRequirement || '',
      hasAiHopeText: !!user.mateRequirement,
    }
  }

  private buildBottomBar(
    isSelf: boolean,
    alreadyContacted: boolean,
  ): BottomBarSection {
    return {
      visible: !isSelf,
      contactText: '想认识Ta',
      matchmakerText: '红娘牵线',
      canContact: !alreadyContacted,
      alreadyContacted,
    }
  }
}

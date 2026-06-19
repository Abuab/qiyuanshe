/**
 * 用户详情页完整数据结构定义
 *
 * 对标竞品"飘飘"个人主页，分区组织数据
 */

// ===================== 1. 顶部区域 =====================

export interface TopSection {
  /** 背景图 URL（取第一张照片） */
  backgroundPhoto: string
  /** 头像 */
  avatar: string
  /** 昵称 */
  nickname: string
  /** 用户 ID（用于展示 @ID123456） */
  userId: number
  /** 是否自己 */
  isSelf: boolean
  /** 当前用户是否已关注 TA */
  isFollowed: boolean
  /** TA 的关注数 */
  followCount: number
  /** TA 的粉丝数 */
  followerCount: number
}

// ===================== 2. 基础资料区 =====================

export interface BasicInfoSection {
  /** 年龄 */
  age: number
  /** 身高 cm */
  height: number
  /** 体重 kg */
  weight: number
  /** 学历 */
  education: string
  /** 生日（不含年份，展示用） */
  birthDay: string
  /** 生肖 */
  zodiac: string
  /** 星座 */
  constellation: string
  /** 职业 */
  occupation: string
  /** 户籍地址 */
  hometown: string
  /** 现居地址 */
  residence: string
}

// ===================== 3. 身份认证区 =====================

export interface IdentityItem {
  /** 认证类型标识：real_name / education / house / car / single_pledge / marital */
  type: string
  /** 展示标签 */
  label: string
  /** 图标名（前端映射） */
  icon: string
  /** 是否已认证 */
  verified: boolean
}

export interface IdentityAuthSection {
  /** 标题（前端显示"身份认证"） */
  title: string
  /** 右侧提示 "点亮的为已认证" */
  hint: string
  /** 认证项列表 */
  items: IdentityItem[]
}

// ===================== 4. 关于我区 =====================

export interface TagItem {
  /** 标签名 */
  name: string
  /** 分类 */
  category: string
  /** 图标 URL */
  iconUrl: string
}

export interface AboutMeSection {
  /** 标题 "关于我" */
  title: string
  /** 用户选择的系统标签 */
  tags: TagItem[]
  /** AI 生成的个人画像文字 */
  aiProfileText: string
  /** 是否有 AI 画像 */
  hasAiProfile: boolean
}

// ===================== 5. Ta希望你区 =====================

export interface PartnerTag {
  /** 条件标签名，如 "年龄范围" */
  label: string
  /** 条件值，如 "25-30岁" */
  value: string
}

export interface HopeTaSection {
  /** 标题 "Ta希望你" */
  title: string
  /** 择偶条件标签 */
  partnerTags: PartnerTag[]
  /** AI 生成的择偶期望文字 */
  aiHopeText: string
  /** 是否有 AI 期望描述 */
  hasAiHopeText: boolean
}

// ===================== 6. 互动区 =====================

export interface InteractionSection {
  /** 收到的礼物总数 */
  giftCount: number
  /** 是否可分享 */
  canShare: boolean
  /** 分享卡片标题 */
  shareTitle: string
}

// ===================== 7. 底部操作栏 =====================

export interface BottomBarSection {
  /** 是否可展示（自己查看时不展示） */
  visible: boolean
  /** "想认识Ta" 按钮文字 */
  contactText: string
  /** "红娘牵线" 按钮文字 */
  matchmakerText: string
  /** 是否可发起认识请求 */
  canContact: boolean
  /** 是否已认识 */
  alreadyContacted: boolean
}

// ===================== 完整返回结构 =====================

/** 用户详情页完整数据 */
export interface UserProfileDetailResponse {
  /** 顶部区域 */
  top: TopSection
  /** 基础资料区 */
  basicInfo: BasicInfoSection
  /** 身份认证区 */
  identityAuth: IdentityAuthSection
  /** 关于我区 */
  aboutMe: AboutMeSection
  /** Ta希望你区 */
  hopeTa: HopeTaSection
  /** 互动区 */
  interaction: InteractionSection
  /** 底部操作栏 */
  bottomBar: BottomBarSection
  /** 是否有 AI 缘分分析入口 */
  showAiMatchEntry: boolean
}

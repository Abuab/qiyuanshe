/**
 * AI 红娘机器人 —— 类型定义
 */

/** 对话消息 */
export interface MatchmakerMessage {
  /** 角色：user / ai */
  role: 'user' | 'ai'
  /** 内容 */
  content: string
  /** 时间 */
  createdAt: string
}

/** 对话请求 */
export interface MatchmakerChatRequest {
  /** 用户消息 */
  message: string
}

/** 对话响应 */
export interface MatchmakerChatResponse {
  /** AI 回复 */
  reply: string
  /** 是否触发安全拦截（如"建议寻求专业帮助"等） */
  safetyNotice?: string
  /** 今日剩余轮数（null = 无限） */
  remainingRounds: number | null
  /** 搜索结果中的匹配用户（仅搜索意图时返回） */
  users?: MatchmakerSearchUser[]
}

/** 搜索条件映射 */
export interface MatchmakerSearchFilters {
  /** 1=男, 2=女 */
  gender?: number
  /** 年龄范围 */
  ageMin?: number
  ageMax?: number
  /** 身高最低值 (cm) */
  heightMin?: number
  /** 城市 */
  city?: string
  /** 省份 */
  province?: string
  /** 学历 */
  education?: string
  /** 婚况 */
  maritalStatus?: string
  /** 收入 */
  incomeRange?: string
  /** 住房 */
  housingStatus?: string
  /** 车辆 */
  carStatus?: string
  /** 返回最大条数（默认 5） */
  limit?: number
}

/** 搜索结果中返回的匹配用户简要信息 */
export interface MatchmakerSearchUser {
  id: number
  nickname: string
  avatar: string
  gender: number
  age: number
  height: number
  education: string
  occupation: string
  residence: string
  hometown: string
  maritalStatus: string
  incomeRange: string
  tags: string[]
  /** 性格+爱好标签（从 personalityTags JSON 解析展平） */
  personalityLabels: string[]
  /** 智能匹配分数 (0-100)，简单搜索时为 undefined */
  matchScore?: number
}

/** 快捷问题列表 */
export const QUICK_QUESTIONS = [
  '第一次约会去哪',
  '怎么开场',
  '对方冷淡怎么办',
  '约会穿搭建议',
  '怎么判断对方真心',
]

// ===== 次数限制 =====

/** 免费用户每日对话轮数 */
export const MATCHMAKER_FREE_DAILY_ROUNDS = 10

// ===== 安全边界话题（需要特殊处理） =====

/** 心理咨询相关关键词 */
export const MENTAL_HEALTH_KEYWORDS = [
  '抑郁', '焦虑', '失眠', '想死', '自杀', '自残', '心理咨询',
  '心理医生', '抑郁了', '很痛苦', '活不下去', '心理问题', '心理疾病',
]

/** 医疗相关关键词 */
export const MEDICAL_KEYWORDS = [
  '看病', '医院', '吃药', '手术', '诊断', '治疗', '疾病',
  '艾滋', '性病', '传染病',
]

/** 法律相关关键词 */
export const LEGAL_KEYWORDS = [
  '起诉', '离婚协议', '律师', '打官司', '财产分割', '法院',
]

/** 诈骗/投资相关关键词 */
export const SCAM_KEYWORDS = [
  '投资', '理财', '赚钱', '项目', '比特币', '股票', '基金',
  '借钱', '贷款', '还钱', '转账', '交钱',
]

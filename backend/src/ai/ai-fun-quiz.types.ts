/**
 * AI 趣味缘分测试 —— 类型定义
 *
 * 词汇合规要求：
 * - 全程不得出现：算命、八字、命理、吉凶、改运、风水、占卜、运势、卦象、面相、手相
 * - 统一使用：缘分密码、契合度测试、性格互补分析、相处指南、趣味解读
 */

/** 发起测试请求 */
export interface FunQuizRequest {
  /** 本人出生日期 YYYY-MM-DD */
  userBirthDay: string
  /** 本人出生时辰（可选） */
  userBirthHour?: string
  /** 对方出生日期 YYYY-MM-DD */
  taBirthDay: string
  /** 对方出生时辰（可选） */
  taBirthHour?: string
}

/** AI 趣味情感问答 —— 用户回答请求 */
export interface FunQuizAnswerRequest {
  answer: string
}

/** 未来时间节点 */
export interface FunTimeNode {
  /** 时间描述，如 "第100天" */
  day: string
  /** 节点标题 */
  title: string
  /** 简单描述 */
  desc: string
}

/** 测试报告响应 */
export interface FunQuizReportResponse {
  /** 报告 ID */
  id: number
  /** 是否来自缓存 */
  fromCache: boolean
  /** 双方星座 */
  userConstellation: string
  taConstellation: string
  /** 双方生肖 */
  userZodiac: string
  taZodiac: string
  /** 性格互补分析 */
  personalityAnalysis: string
  /** 相处模式建议 */
  relationshipAdvice: string
  /** 3个未来趣味时间节点 */
  timeNodes: FunTimeNode[]
  /** 3组契合关键词 */
  keywords: string[]
  /** 今日剩余次数 */
  remainingQuota: number
  /** 生成时间 */
  createdAt: string
}

// ===== 次数限制 =====

/** 免费用户每日次数 */
export const FUN_QUIZ_FREE_DAILY_LIMIT = 2
/** 会员用户每日次数 */
export const FUN_QUIZ_VIP_DAILY_LIMIT = 10

/** 缓存天数 */
export const FUN_QUIZ_CACHE_DAYS = 7

// ===== 免责声明 =====

export const FUN_QUIZ_DISCLAIMER =
  '本测试仅供娱乐，请理性看待，感情需要双方用心经营。'

// ===== 星座映射 =====

export const CONSTELLATION_MAP: [string, number, number][] = [
  ['摩羯座', 1, 19], ['水瓶座', 2, 18], ['双鱼座', 3, 20],
  ['白羊座', 4, 19], ['金牛座', 5, 20], ['双子座', 6, 21],
  ['巨蟹座', 7, 22], ['狮子座', 8, 22], ['处女座', 9, 22],
  ['天秤座', 10, 23], ['天蝎座', 11, 22], ['射手座', 12, 21],
]

// ===== 生肖映射 =====

const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

export function calcConstellation(month: number, day: number): string {
  for (let i = CONSTELLATION_MAP.length - 1; i >= 0; i--) {
    const [name, m, d] = CONSTELLATION_MAP[i]
    if (month === m && day <= d) return name
    if (month > m) return CONSTELLATION_MAP[(i + 1) % 12][0]
  }
  return '摩羯座'
}

export function calcZodiac(year: number): string {
  // 农历生肖以立春为界，简化按公历年份计算
  return ZODIACS[(year - 4) % 12]
}

/** 逆映射：从星座名获取日期范围（用于 AI Prompt 上下文） */
export function getConstellationDateRange(name: string): string {
  const idx = CONSTELLATION_MAP.findIndex(([n]) => n === name)
  if (idx === -1) return ''
  const next = CONSTELLATION_MAP[(idx + 1) % 12]
  return `${next[1]}月${next[2]}日-${CONSTELLATION_MAP[idx][1]}月${CONSTELLATION_MAP[idx][2]}日`
}

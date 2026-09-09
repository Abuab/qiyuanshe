/**
 * 匹配分析报告 —— 规则引擎（纯函数，无副作用）
 *
 * 说明：本项目用户详细资料与择偶要求字段全部内联在 users 表（无 user_profiles/user_preferences 表），
 * 本模块直接基于 User 实体字段计算画像标签、健康度、雷达图与提升建议。
 */

export interface Radar {
  profileCompleteness: number
  attractiveness: number
  matchRange: number
  activity: number
  sincerity: number
}

export interface HealthResult {
  score: number
  level: string
  advice: string[]
}

/** 从字符串中提取所有数字，如 "25-30" / "25~30岁" → [25, 30] */
export function parseNumbers(text: string | null | undefined): number[] {
  if (!text) return []
  const matches = text.match(/\d+/g)
  return matches ? matches.map(Number) : []
}

/** 解析择偶年龄范围，返回 { min, max }；无法解析返回 null */
export function parseAgeRange(text: string | null | undefined): { min: number | null; max: number | null } | null {
  const nums = parseNumbers(text)
  if (nums.length === 0) return null
  if (nums.length === 1) return { min: nums[0], max: null }
  return { min: Math.min(nums[0], nums[nums.length - 1]), max: Math.max(nums[0], nums[nums.length - 1]) }
}

/** 解析择偶最低身高（字符串，如 "170" / "170cm"） */
export function parseHeightMin(text: string | null | undefined): number | null {
  const nums = parseNumbers(text)
  return nums.length > 0 ? nums[0] : null
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)))
}

function hasText(v: string | null | undefined): boolean {
  return !!v && v.trim().length > 0
}

/**
 * 个人画像标签（5~8 个）
 * 从职业/学历/星座/生肖/性格标签/兴趣标签/年龄区间等字段映射，去重后最多取 8 个。
 */
export function buildProfileTags(user: {
  occupation?: string | null
  education?: string | null
  constellation?: string | null
  zodiac?: string | null
  gender?: number
  birthYear?: number | null
  personalityTags?: string[] | null
  tags?: string[] | null
}, selectedTagNames: string[] = []): string[] {
  const tags: string[] = []

  const push = (v?: string | null) => {
    if (hasText(v)) tags.push((v as string).trim())
  }

  // 年龄区间标签（如 90后）
  if (user.birthYear) {
    const decade = Math.floor(user.birthYear / 10) * 10
    tags.push(`${String(decade).slice(2)}0后`)
  }

  push(user.occupation)
  push(user.education)
  push(user.constellation)
  push(user.zodiac)

  const personality = (user.personalityTags || []).filter(Boolean).slice(0, 3)
  personality.forEach(push)

  const baseTags = (user.tags || []).filter(Boolean).slice(0, 2)
  baseTags.forEach(push)

  selectedTagNames.filter(Boolean).slice(0, 3).forEach(push)

  // 去重 + 过滤空 + 截断
  const seen = new Set<string>()
  const result: string[] = []
  for (const t of tags) {
    if (!t || seen.has(t)) continue
    seen.add(t)
    result.push(t)
    if (result.length >= 8) break
  }

  return result
}

/**
 * 择偶标准健康度评分（0~100）
 * 规则：年龄范围 <3 岁=偏严，3~10 岁=合理，>10 岁=偏宽；硬性条件过多酌情扣分。
 */
export function scoreHealth(user: {
  partnerAgeRange?: string | null
  partnerEducation?: string | null
  partnerIncome?: string | null
  housingRequirement?: string | null
  partnerMaritalStatus?: string | null
}): HealthResult {
  let score = 100
  let level = '合理'
  const advice: string[] = []

  const ageRange = parseAgeRange(user.partnerAgeRange)
  if (!ageRange) {
    score -= 10
    level = '待完善'
    advice.push('建议补充期望年龄范围，让匹配更精准')
  } else if (ageRange.min !== null && ageRange.max !== null) {
    const diff = ageRange.max - ageRange.min
    if (diff < 3) {
      score -= 30
      level = '偏严'
      advice.push('年龄范围偏窄（<3岁），建议放宽至 3~10 岁以扩大匹配范围')
    } else if (diff > 10) {
      score -= 10
      level = '偏宽'
      advice.push('年龄范围偏宽（>10岁），建议适当聚焦，提高匹配精准度')
    } else {
      advice.push('年龄范围设定合理')
    }
  } else {
    score -= 5
    level = '合理'
    advice.push('年龄范围仅有单边，建议补齐上下限')
  }

  // 硬性条件数量（学历/收入/房产/婚姻状况 4 项中已填写的越多越苛刻）
  const hardConditions = [
    user.partnerEducation,
    user.partnerIncome,
    user.housingRequirement,
    user.partnerMaritalStatus,
  ].filter((v) => hasText(v)).length

  if (hardConditions >= 3) {
    score -= 10
    advice.push('硬性条件较多，可适当放宽部分非核心条件，避免错失缘分')
  }

  return { score: clamp(score), level, advice }
}

/** 综合匹配指数雷达图五维（0~100） */
export function buildRadar(user: {
  profileScore?: number
  avatar?: string | null
  birthYear?: number | null
  isRealName?: number
  eidCertStatus?: number
  protocolAgreedAt?: Date | null
  lastActiveAt?: Date | null
  partnerAgeRange?: string | null
  partnerEducation?: string | null
  mateRequirement?: string | null
}, photoCount: number): Radar {
  // 资料完整度：优先用实体上已有的 profileScore，缺失时按关键字段估算
  let profileCompleteness = user.profileScore || 0
  if (!profileCompleteness) {
    const fields = [user.avatar, user.birthYear, user.partnerAgeRange, user.mateRequirement]
    profileCompleteness = Math.round((fields.filter(hasText).length / fields.length) * 100)
  }

  // 吸引力：头像 + 照片数量
  let attractiveness = 40
  if (hasText(user.avatar)) attractiveness += 20
  attractiveness += Math.min(photoCount, 5) * 8

  // 匹配范围：年龄范围越合理、择偶要求越明确，得分越高
  let matchRange = 40
  const ageRange = parseAgeRange(user.partnerAgeRange)
  if (ageRange && ageRange.min !== null && ageRange.max !== null) {
    matchRange += 30
  } else if (ageRange) {
    matchRange += 15
  }
  if (hasText(user.partnerEducation)) matchRange += 15
  if (hasText(user.mateRequirement)) matchRange += 15

  // 活跃度：按最后活跃时间衰减
  let activity = 30
  if (user.lastActiveAt) {
    const days = Math.floor((Date.now() - user.lastActiveAt.getTime()) / 86400000)
    if (days <= 1) activity = 100
    else if (days <= 7) activity = 70
    else if (days <= 30) activity = 40
    else activity = 20
  }

  // 真诚度：实名 + E证通 + 已同意协议
  let sincerity = 30
  if (user.isRealName) sincerity += 30
  if (user.eidCertStatus === 2) sincerity += 20
  if (user.protocolAgreedAt) sincerity += 20

  return {
    profileCompleteness: clamp(profileCompleteness),
    attractiveness: clamp(attractiveness),
    matchRange: clamp(matchRange),
    activity: clamp(activity),
    sincerity: clamp(sincerity),
  }
}

/** 个人提升建议（基于资料完整度） */
export function buildSuggestions(user: {
  avatar?: string | null
  housingStatus?: string | null
  carStatus?: string | null
  onlyChild?: string | null
  whenMarry?: string | null
  partnerAgeRange?: string | null
  mateRequirement?: string | null
}, photoCount: number, tagCount: number): string[] {
  const suggestions: string[] = []

  if (!hasText(user.avatar)) suggestions.push('上传头像，让更多人认识你')
  if (photoCount === 0) suggestions.push('补充生活照片，提升资料吸引力')
  if (tagCount === 0) suggestions.push('补充兴趣爱好标签，丰富个人画像')

  const familyMissing = !hasText(user.housingStatus)
    || !hasText(user.carStatus)
    || !hasText(user.onlyChild)
    || !hasText(user.whenMarry)
  if (familyMissing) suggestions.push('完善房车情况与结婚计划，展示真实诚意')

  const mateMissing = !hasText(user.partnerAgeRange) || !hasText(user.mateRequirement)
  if (mateMissing) suggestions.push('完善择偶要求，让匹配更精准')

  if (suggestions.length === 0) suggestions.push('资料已较为完善，继续保持活跃度')

  return suggestions
}

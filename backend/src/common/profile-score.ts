/**
 * 计算用户资料完整度 (0~100)
 * 基于 18 项资料字段的加权评分
 */
export function calcProfileScore(user: any): number {
  const fields: { weight: number; check: (u: any) => boolean }[] = [
    { weight: 10, check: (u) => !!u.nickname },
    { weight: 10, check: (u) => !!u.avatar },
    { weight: 5, check: (u) => u.gender > 0 },
    { weight: 5, check: (u) => !!u.birthYear },
    { weight: 5, check: (u) => !!u.height },
    { weight: 5, check: (u) => !!u.weight },
    { weight: 5, check: (u) => !!u.education },
    { weight: 5, check: (u) => !!u.occupation },
    { weight: 5, check: (u) => !!u.incomeRange },
    { weight: 5, check: (u) => !!u.housingStatus },
    { weight: 5, check: (u) => !!u.carStatus },
    { weight: 5, check: (u) => !!u.maritalStatus },
    { weight: 5, check: (u) => !!u.hometown },
    { weight: 5, check: (u) => !!u.residence },
    { weight: 5, check: (u) => ensureArray(user.tags).length > 0 },
    { weight: 5, check: (u) => !!u.mateRequirement },
    { weight: 5, check: (u) => u.isRealName > 0 },
    { weight: 5, check: (u) => u.photos?.length > 0 || u.photoCount > 0 },
  ]

  let score = 0
  for (const f of fields) {
    if (f.check(user)) score += f.weight
  }
  return score
}

function ensureArray(val: unknown): any[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return [] }
  }
  return []
}

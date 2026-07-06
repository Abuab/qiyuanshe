/**
 * 人格测试 - 计算逻辑（纯函数，便于单元测试）
 *
 * 计算流程：
 * 1. 每道题的两个选项分别对应所属维度的一个方向，累计各维度两个方向的得分。
 * 2. 每个维度取高分方向作为结果；若同分，优先以用户在该维度「第一道题」的选择方向判定。
 * 3. 按维度排序拼接四个方向标识组成人格类型编码（如 ISTJ）。
 * 4. 每个维度得分映射到 0-100 区间生成雷达图数据（值表示朝向 A 方向的强度）。
 */

/** 维度定义（计算所需子集） */
export interface ScoringDimension {
  id: number
  code: string
  name: string
  directionAKey: string
  directionALabel: string
  directionBKey: string
  directionBLabel: string
  sort: number
}

/** 题目定义（计算所需子集） */
export interface ScoringQuestion {
  questionId: number
  dimensionId: number
  dimensionCode: string
}

/** 选项定义（计算所需子集） */
export interface ScoringOption {
  optionId: number
  questionId: number
  directionKey: string
  score: number
}

/** 一条作答（按提交顺序） */
export interface ScoringAnswer {
  questionId: number
  optionId: number
}

/** 单维度结果 */
export interface DimensionResult {
  code: string
  name: string
  chosenKey: string
  chosenLabel: string
  scoreA: number
  scoreB: number
  /** 朝向 A 方向的强度百分比（0-100） */
  radar: number
}

/** 计算结果 */
export interface ScoringResult {
  typeCode: string
  radar: Record<string, number>
  dimensions: DimensionResult[]
}

/**
 * 计算人格类型
 * @param answers 用户作答（顺序即提交顺序，用于同分判定「第一道题」）
 * @param questions 题目集合
 * @param options 选项集合
 * @param dimensions 维度集合（全部启用维度，按 sort 排序拼接编码）
 */
export function computePersonalityResult(
  answers: ScoringAnswer[],
  questions: ScoringQuestion[],
  options: ScoringOption[],
  dimensions: ScoringDimension[],
): ScoringResult {
  const questionMap = new Map<number, ScoringQuestion>()
  for (const q of questions) questionMap.set(q.questionId, q)

  const optionMap = new Map<number, ScoringOption>()
  for (const o of options) optionMap.set(o.optionId, o)

  const dimByCode = new Map<string, ScoringDimension>()
  for (const d of dimensions) dimByCode.set(d.code, d)

  // 每个维度两个方向的累计得分
  const scores = new Map<string, { a: number; b: number }>()
  // 每个维度第一道题所选方向（用于同分判定）
  const firstChoice = new Map<string, string>()

  for (const ans of answers) {
    const q = questionMap.get(ans.questionId)
    if (!q) continue
    const opt = optionMap.get(ans.optionId)
    // 选项必须属于该题，防止篡改
    if (!opt || opt.questionId !== ans.questionId) continue
    const dim = dimByCode.get(q.dimensionCode)
    if (!dim) continue

    if (!scores.has(dim.code)) scores.set(dim.code, { a: 0, b: 0 })
    const bucket = scores.get(dim.code)!

    const inc = Number.isFinite(opt.score) && opt.score > 0 ? opt.score : 1
    if (opt.directionKey === dim.directionAKey) {
      bucket.a += inc
    } else if (opt.directionKey === dim.directionBKey) {
      bucket.b += inc
    } else {
      // 选项方向不属于该维度，忽略（数据异常防御）
      continue
    }

    if (!firstChoice.has(dim.code)) {
      firstChoice.set(dim.code, opt.directionKey)
    }
  }

  // 按维度 sort 升序拼接类型编码，保证结果稳定
  const ordered = [...dimensions].sort((x, y) => x.sort - y.sort || x.id - y.id)

  const dimensionResults: DimensionResult[] = []
  const radar: Record<string, number> = {}
  let typeCode = ''

  for (const dim of ordered) {
    const bucket = scores.get(dim.code) || { a: 0, b: 0 }
    const total = bucket.a + bucket.b

    let chosenKey: string
    if (bucket.a > bucket.b) {
      chosenKey = dim.directionAKey
    } else if (bucket.b > bucket.a) {
      chosenKey = dim.directionBKey
    } else {
      // 同分：优先以第一道题的选择方向；若该维度未作答则默认 A 方向
      chosenKey = firstChoice.get(dim.code) || dim.directionAKey
    }

    const chosenLabel =
      chosenKey === dim.directionAKey ? dim.directionALabel : dim.directionBLabel

    // 雷达值：朝向 A 方向的强度百分比；无作答则中性 50
    const radarValue = total > 0 ? Math.round((bucket.a / total) * 100) : 50

    radar[dim.code] = radarValue
    dimensionResults.push({
      code: dim.code,
      name: dim.name,
      chosenKey,
      chosenLabel,
      scoreA: bucket.a,
      scoreB: bucket.b,
      radar: radarValue,
    })
    typeCode += chosenKey
  }

  return { typeCode, radar, dimensions: dimensionResults }
}

/**
 * Fisher-Yates 洗牌（返回新数组，不修改入参）
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

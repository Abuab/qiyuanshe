/**
 * AI 人格解读合规工具
 *
 * 严禁"算命/运势/命理/命中注定"等绝对化或封建迷信表述，
 * 统一改用"性格互补度较高""建议尝试了解"等软性表达。
 */

/** 禁用词（命中即视为不合规，触发降级/兜底） */
export const FORBIDDEN_WORDS: string[] = [
  '算命',
  '运势',
  '命理',
  '命中注定',
  '天注定',
  '宿命',
  '八字',
  '风水',
  '转运',
  '旺夫',
  '克夫',
  '旺妻',
  '克妻',
  '生辰八字',
  '姻缘天定',
  '注定在一起',
  '命定',
]

/** 合规约束文案，注入到 Prompt 中，约束模型输出 */
export const COMPLIANCE_PROMPT = `【合规硬约束】
- 严禁出现"算命、运势、命理、命中注定、宿命、八字、风水、转运、旺夫/克夫"等封建迷信或绝对化词汇；
- 用"性格互补度较高""在某些方面较为契合""建议尝试进一步了解"等软性、非绝对化表述；
- 全部结论均为基于性格测评的参考建议，不做命运断言、不承诺结果。`

/** 检测文本是否命中禁用词 */
export function findForbiddenWords(text: string): string[] {
  if (!text) return []
  const hits: string[] = []
  for (const w of FORBIDDEN_WORDS) {
    if (text.includes(w)) hits.push(w)
  }
  return hits
}

/** 是否合规（无禁用词） */
export function isCompliant(text: string): boolean {
  return findForbiddenWords(text).length === 0
}

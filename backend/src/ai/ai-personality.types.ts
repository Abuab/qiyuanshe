/** AI 生成内容统一免责声明 */
export const AI_DISCLAIMER = '内容由 AI 生成，仅供参考'

/** 性格深度解读结果 */
export interface InterpretationResult {
  typeCode: string
  typeName: string
  loveStrengths: string
  cautions: string
  idealPartner: string
  dateScenes: string
  fallback: boolean
  disclaimer: string
  generatedAt: string
}

/** 红娘匹配建议结果 */
export interface MatchAdviceResult {
  complement: string
  friction: string
  icebreakers: string[]
  dateScenes: string[]
  fallback: boolean
  disclaimer: string
}

/** 分享文案结果 */
export interface ShareCopyResult {
  style: string
  copies: string[]
  fallback: boolean
  disclaimer: string
}

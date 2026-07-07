/**
 * AI 性格解读 / 匹配建议 / 分享文案 —— 默认 Prompt 模板与变量元数据
 *
 * 模板存储在 system_configs（key: ai.prompt.*），管理后台可编辑、即时生效。
 * 此处仅提供「默认值」与「可用变量说明」，供 Seeder/降级与后台展示使用。
 */

/** 模板 DB key */
export const PROMPT_KEYS = {
  PERSONALITY: 'ai.prompt.personality',
  MATCH_ADVICE: 'ai.prompt.matchAdvice',
  SHARE_HUMOR: 'ai.prompt.shareCopy.humor',
  SHARE_LITERARY: 'ai.prompt.shareCopy.literary',
  SHARE_SINCERE: 'ai.prompt.shareCopy.sincere',
} as const

/** 分享文案风格 */
export type ShareCopyStyle = 'humor' | 'literary' | 'sincere'

export const SHARE_STYLE_KEY_MAP: Record<ShareCopyStyle, string> = {
  humor: PROMPT_KEYS.SHARE_HUMOR,
  literary: PROMPT_KEYS.SHARE_LITERARY,
  sincere: PROMPT_KEYS.SHARE_SINCERE,
}

/** 性格解读默认模板 */
const DEFAULT_PERSONALITY = `你是一位温暖专业的婚恋性格顾问。请根据用户的人格测评结果，生成一段专属的恋爱性格解读。

用户昵称：{{nickname}}
人格类型：{{typeName}}（{{typeCode}}）
类型简述：{{typeSummary}}
四维度得分（0-100，越高越偏向前者）：
{{dimensionDetail}}

请务必结合上述「四维度得分」进行个性化分析，不要套用通用模板。返回严格 JSON（不要 markdown 代码块）：
{
  "loveStrengths": "恋爱中的优势（60-100字，结合维度得分）",
  "cautions": "需要注意的相处模式（60-100字）",
  "idealPartner": "适合什么样的伴侣（60-100字）",
  "dateScenes": "约会场景建议（60-100字，给出2-3个具体场景）"
}`

/** 匹配建议默认模板 */
const DEFAULT_MATCH_ADVICE = `你是一位专业的婚恋红娘顾问。请根据双方的人格测评结果，生成一段匹配分析与聊天建议。

【用户A】{{nickname}}：{{typeName}}（{{typeCode}}）
A 的四维度得分：
{{dimensionDetail}}

【用户B】{{taNickname}}：{{taTypeName}}（{{taTypeCode}}）
B 的四维度得分：
{{taDimensionDetail}}

请结合双方四维度得分做个性化分析。返回严格 JSON（不要 markdown 代码块）：
{
  "complement": "性格互补点（60-100字）",
  "friction": "潜在摩擦点及化解建议（60-100字）",
  "icebreakers": ["破冰话题1", "破冰话题2", "破冰话题3"],
  "dateScenes": ["约会场景建议1", "约会场景建议2"]
}`

/** 分享文案默认模板（按风格） */
const DEFAULT_SHARE_HUMOR = `请以「幽默风趣」的风格，为人格类型「{{typeName}}（{{typeCode}}）」的用户 {{nickname}} 生成 3 条适合发朋友圈的分享文案。
类型简述：{{typeSummary}}
每条 30 字以内，轻松俏皮、有梗但不低俗。返回严格 JSON：{ "copies": ["文案1","文案2","文案3"] }`

const DEFAULT_SHARE_LITERARY = `请以「文艺清新」的风格，为人格类型「{{typeName}}（{{typeCode}}）」的用户 {{nickname}} 生成 3 条适合发朋友圈的分享文案。
类型简述：{{typeSummary}}
每条 30 字以内，含蓄唯美、有意境。返回严格 JSON：{ "copies": ["文案1","文案2","文案3"] }`

const DEFAULT_SHARE_SINCERE = `请以「直接真诚」的风格，为人格类型「{{typeName}}（{{typeCode}}）」的用户 {{nickname}} 生成 3 条适合发朋友圈的分享文案。
类型简述：{{typeSummary}}
每条 30 字以内，真挚坦诚、温暖有力量。返回严格 JSON：{ "copies": ["文案1","文案2","文案3"] }`

export const DEFAULT_TEMPLATES: Record<string, string> = {
  [PROMPT_KEYS.PERSONALITY]: DEFAULT_PERSONALITY,
  [PROMPT_KEYS.MATCH_ADVICE]: DEFAULT_MATCH_ADVICE,
  [PROMPT_KEYS.SHARE_HUMOR]: DEFAULT_SHARE_HUMOR,
  [PROMPT_KEYS.SHARE_LITERARY]: DEFAULT_SHARE_LITERARY,
  [PROMPT_KEYS.SHARE_SINCERE]: DEFAULT_SHARE_SINCERE,
}

/** 后台展示用：模板元数据（含可用变量说明） */
export const PROMPT_TEMPLATE_META = [
  {
    key: PROMPT_KEYS.PERSONALITY,
    label: 'AI性格深度解读',
    variables: ['{{nickname}}', '{{typeName}}', '{{typeCode}}', '{{typeSummary}}', '{{dimensionDetail}}'],
  },
  {
    key: PROMPT_KEYS.MATCH_ADVICE,
    label: 'AI红娘匹配建议',
    variables: [
      '{{nickname}}', '{{typeName}}', '{{typeCode}}', '{{dimensionDetail}}',
      '{{taNickname}}', '{{taTypeName}}', '{{taTypeCode}}', '{{taDimensionDetail}}',
    ],
  },
  {
    key: PROMPT_KEYS.SHARE_HUMOR,
    label: '分享文案-幽默风趣',
    variables: ['{{nickname}}', '{{typeName}}', '{{typeCode}}', '{{typeSummary}}'],
  },
  {
    key: PROMPT_KEYS.SHARE_LITERARY,
    label: '分享文案-文艺清新',
    variables: ['{{nickname}}', '{{typeName}}', '{{typeCode}}', '{{typeSummary}}'],
  },
  {
    key: PROMPT_KEYS.SHARE_SINCERE,
    label: '分享文案-直接真诚',
    variables: ['{{nickname}}', '{{typeName}}', '{{typeCode}}', '{{typeSummary}}'],
  },
]

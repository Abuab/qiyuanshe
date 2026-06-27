/**
 * AI 红娘机器人 —— 角色设定 & 系统提示词
 *
 * 角色：栖缘社资深红娘
 * 擅长：恋爱指导、约会建议、情感分析、穿搭推荐、破冰话题
 * 风格：亲切、实用、接地气，回复控制在100字以内
 */

export const MATCHMAKER_SYSTEM_PROMPT = `你是一位资深婚恋红娘，在"{{appName}}"婚恋交友平台工作多年，帮助过上千对单身男女找到真爱。

【你的风格】
- 亲切温暖，像知心大姐/大哥一样和用户聊天
- 实用接地气，建议具体可执行，不说空洞的鸡汤
- 回复简洁，控制在100字以内，适当分点
- 用"你"称呼用户，拉近距离

【你的专业领域】
- 恋爱指导：如何推进关系、如何表达好感、如何处理矛盾
- 约会建议：第一次约会去哪、聊什么话题、穿什么
- 情感分析：帮用户分析对方态度、判断是否合适
- 穿搭推荐：根据用户特点建议约会穿搭
- 破冰话题：帮用户找话题，打破聊天尴尬
- 相亲技巧：见面注意事项、加分项目

【安全边界 - 必须严格遵守】
遇到以下情况，必须按规则回复：

1. 心理咨询类（抑郁、焦虑、失眠、自杀倾向等）→ 回复"我能感受到你此刻的心情，但心理问题建议寻求专业心理咨询师帮助。如有需要，可以拨打心理援助热线：400-161-9995"

2. 医疗健康类（疾病、用药、手术等）→ 回复"健康问题建议咨询专业医生，我可以帮你参谋怎么在约会时展现最好的状态"

3. 法律类（离婚、财产、官司等）→ 回复"法律问题建议咨询专业律师，红娘更擅长帮你找到合适的另一半哦"

4. 投资/理财/借钱/诈骗类 → 回复"{{appName}}是真诚交友的平台，请您保持警惕，不要轻信任何涉及金钱的请求。如遇可疑行为，请向红娘举报"

5. 色情/性暗示/约炮/低俗类 → 回复"请保持文明交流。{{appName}}是一个真诚、健康的婚恋交友平台，我们应该相互尊重"

6. 索要私密照片 → 回复"我们鼓励真诚交流，但请保护好自己的隐私，不要发送私密照片哦"

7. 要求安排线下见面/开房 → 回复"见面是好事，建议在公共场合约见（如咖啡厅、餐厅），保持安全距离，慢慢了解"

【内容安全约束】
- 严禁出现任何性暗示、性骚扰诱导、低俗身体描述、开黄腔
- 严禁提供性服务信息
- 严禁教唆违法行为
- 保持积极、健康、尊重的交友基调

现在有用户来向你咨询了，请用亲切自然的语气回复。
`

/**
 * 构建多轮对话 Prompt
 */
export function buildMatchmakerChatPrompt(
  history: { role: 'user' | 'ai'; content: string }[],
  userMessage: string,
  searchContext?: string,
): string {
  const recentHistory = history.slice(-10)

  // 搜索到的用户列表作为额外上下文
  let fullMessage = userMessage
  if (searchContext) {
    fullMessage = [
      userMessage,
      '',
      '【系统提示：平台用户库里已为你匹配到以下用户，请在回复中自然地向用户介绍他们：】',
      searchContext,
    ].join('\n')
  }

  if (recentHistory.length === 0) {
    return fullMessage
  }

  return [
    '以下是之前的对话记录：',
    ...recentHistory.map((m) => `${m.role === 'user' ? '用户' : '红娘'}: ${m.content}`),
    `\n用户的当前问题: ${fullMessage}\n请回复：`,
  ].join('\n')
}

/**
 * 检测用户消息是否触发安全边界
 * 返回 null = 正常，返回字符串 = 触发边界的自动回复
 */
export function checkSafetyBoundary(userMessage: string): string | null {
  const msg = userMessage.toLowerCase()

  // 1. 色情/性暗示 → 拒绝
  const sexualWords = ['约炮', '约吗', '开房', '上床', '一夜情', '裸聊', '包养', '做爱', '性', '色情']
  for (const w of sexualWords) {
    if (msg.includes(w)) {
      return '请保持文明交流。{{appName}}是一个真诚、健康的婚恋交友平台，我们应该相互尊重'
    }
  }

  // 2. 心理咨询 → 引导
  const mentalWords = ['抑郁', '焦虑', '想死', '自杀', '自残', '心理疾病', '心理问题']
  for (const w of mentalWords) {
    if (msg.includes(w)) {
      return '我能感受到你此刻的心情，但心理问题建议寻求专业心理咨询师帮助。如有需要，可以拨打心理援助热线：400-161-9995'
    }
  }

  // 3. 医疗 → 引导
  const medicalWords = ['看病', '吃药', '手术', '诊断', '传染', '艾滋', '性病']
  for (const w of medicalWords) {
    if (msg.includes(w)) {
      return '健康问题建议咨询专业医生，我可以帮你参谋怎么在约会时展现最好的状态'
    }
  }

  // 4. 法律 → 引导
  const legalWords = ['起诉', '打官司', '离婚协议', '财产分割', '律师']
  for (const w of legalWords) {
    if (msg.includes(w)) {
      return '法律问题建议咨询专业律师，红娘更擅长帮你找到合适的另一半哦'
    }
  }

  // 5. 投资/借钱 → 警示
  const scamWords = ['投资理财', '稳赚', '高回报', '借钱', '贷款', '转账给我', '比特币', '博彩', '赌博']
  for (const w of scamWords) {
    if (msg.includes(w)) {
      return '{{appName}}是真诚交友的平台，请您保持警惕，不要轻信任何涉及金钱的请求。如遇可疑行为，请向红娘举报'
    }
  }

  // 6. 私密照 → 劝阻
  if (msg.includes('私密照') || msg.includes('裸照')) {
    return '我们鼓励真诚交流，但请保护好自己的隐私，不要发送私密照片哦'
  }

  return null
}

// ===== 搜索意图解析 =====

/** 搜索意图触发关键词（快速预检，避免每次都调 AI） */
export const SEARCH_INTENT_KEYWORDS = [
  '推荐', '搜索', '有没有', '介绍', '匹配',
  '帮我找', '帮我推荐', '给我推荐', '找人', '找一个', '找个',
]

/** 搜索过滤解析 System Prompt */
export const MATCHMAKER_SEARCH_PARSE_PROMPT = `你是一个搜索条件解析器。从用户的自然语言消息中提取结构化的搜索条件，只返回合法的 JSON。

可用字段（全部可选，未提及则省略）：
- gender: 1=男, 2=女
- ageMin: 最低年龄
- ageMax: 最高年龄
- heightMin: 最低身高(cm)
- city: 城市名（如"杭州"、"北京"）
- province: 省份名（如"浙江"、"广东"）
- education: 学历（如"本科"、"硕士"）
- maritalStatus: 婚况（如"未婚"、"离异"）
- incomeRange: 收入水平
- housingStatus: 住房情况（如"有房"、"无房"）
- carStatus: 车辆情况（如"有车"、"无车"）
- limit: 返回条数（默认5，最大10）

规则：
1. 如果消息不是搜索/找人/推荐用户，返回: {"type":"no_search"}
2. 如果是搜索但无明确条件，返回包含 gender 的最小条件即可
3. 只返回 JSON，不要任何额外文字

示例：
用户: "帮我推荐3个25-30岁在杭州的女生"
输出: {"gender":2,"ageMin":25,"ageMax":30,"city":"杭州","limit":3}

用户: "有没有35岁以下、身高170以上的男生"
输出: {"gender":1,"ageMax":35,"heightMin":170}

用户: "今天天气怎么样"
输出: {"type":"no_search"}

用户消息: `

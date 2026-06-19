/**
 * AI 缘分匹配分析 —— 提示词模板
 *
 * 核心要求：
 * - 严禁出现任何性暗示、性骚扰诱导、低俗身体描述、开黄腔
 * - 保持积极、尊重、健康的婚恋交友基调
 * - 输出严格 JSON 格式
 */

export function buildMatchPrompt(snapshot: {
  me: {
    nickname: string
    gender: number
    age: number
    height: number
    education: string
    occupation: string
    incomeRange: string
    housingStatus: string
    carStatus: string
    maritalStatus: string
    hometown: string
    residence: string
    zodiac: string
    constellation: string
    tags: string[]
    answers: { question: string; answer: string }[]
  }
  ta: {
    nickname: string
    age: number
    height: number
    education: string
    occupation: string
    incomeRange: string
    housingStatus: string
    carStatus: string
    maritalStatus: string
    hometown: string
    residence: string
    zodiac: string
    constellation: string
    tags: string[]
    answers: { question: string; answer: string }[]
  }
  overlapTags: string[]
}): string {
  const g = (v: any) => v || '未知'

  return `你是一个专业的婚恋匹配顾问。请根据以下双方的真实资料，生成一份积极、健康、尊重的缘分匹配分析报告。

【重要】内容安全约束：
- 严格禁止任何形式的性暗示、性骚扰诱导词句、低俗身体描述、开黄腔
- 不使用任何带有性含义的双关语或暧昧暗示
- 保持专业、得体、积极向上的语言风格
- 聚焦于性格契合度、生活方式匹配、未来规划分析等健康主题

--- 用户信息 ---
昵称：${snapshot.me.nickname}
年龄：${snapshot.me.age}岁
身高：${snapshot.me.height}cm
学历：${g(snapshot.me.education)}
职业：${g(snapshot.me.occupation)}
收入：${g(snapshot.me.incomeRange)}
住房：${g(snapshot.me.housingStatus)}
购车：${g(snapshot.me.carStatus)}
婚况：${g(snapshot.me.maritalStatus)}
籍贯：${g(snapshot.me.hometown)}
现居：${g(snapshot.me.residence)}
生肖：${g(snapshot.me.zodiac)}
星座：${g(snapshot.me.constellation)}
个人标签：${snapshot.me.tags.join('、') || '无'}
问答内容：
${snapshot.me.answers.map((a, i) => `  ${i + 1}. Q: ${a.question} A: ${a.answer}`).join('\n') || '无'}

--- 对方信息 ---
昵称：${snapshot.ta.nickname}
年龄：${snapshot.ta.age}岁
身高：${snapshot.ta.height}cm
学历：${g(snapshot.ta.education)}
职业：${g(snapshot.ta.occupation)}
收入：${g(snapshot.ta.incomeRange)}
住房：${g(snapshot.ta.housingStatus)}
购车：${g(snapshot.ta.carStatus)}
婚况：${g(snapshot.ta.maritalStatus)}
籍贯：${g(snapshot.ta.hometown)}
现居：${g(snapshot.ta.residence)}
生肖：${g(snapshot.ta.zodiac)}
星座：${g(snapshot.ta.constellation)}
个人标签：${snapshot.ta.tags.join('、') || '无'}
问答内容：
${snapshot.ta.answers.map((a, i) => `  ${i + 1}. Q: ${a.question} A: ${a.answer}`).join('\n') || '无'}

--- 双方重叠标签 ---
${snapshot.overlapTags.join('、') || '无共同标签'}

请返回严格 JSON 格式（不要包含 markdown 代码块标记，只返回纯 JSON）：

{
  "overallScore": 78,
  "valuesScore": 82,
  "lifestyleScore": 70,
  "futurePlanScore": 75,
  "analysis": "从资料来看，双方在价值观上有较高的契合度...（80-120字的自然语言分析，聚焦于三观、生活方式、未来规划，不使用任何性暗示词汇）",
  "advice": [
    "第一条具体的、积极的相处建议",
    "第二条具体的、积极的相处建议",
    "第三条具体的、积极的相处建议"
  ]
}

评分标准：
- overallScore：综合考虑三个维度的匹配度，0-100
- valuesScore：基于标签重叠和问答内容判断的三观契合度，0-100
- lifestyleScore：基于职业、收入、住房等判断的生活方式契合度，0-100
- futurePlanScore：基于婚况、购房购车状况等判断的未来规划契合度，0-100
- analysis：80-120字，用温暖的文字描述双方匹配亮点和互补之处，不得有任何负面评价
- advice：3条具体的、健康积极的交往建议，每条约20-30字

【再次强调】请严格遵守内容安全约束，只返回纯JSON。`
}

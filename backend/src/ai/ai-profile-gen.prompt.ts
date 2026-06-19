/**
 * AI 个人画像生成 —— 提示词模板
 *
 * 基于系统标签 + 审核通过的问答，生成吸引人的自我介绍式画像文字
 */

export function buildProfileGenPrompt(context: {
  nickname: string
  gender: string
  age: number
  tags: string[]
  answers: { question: string; answer: string }[]
}): string {
  const genderText = context.gender === '男' ? '男生' : '女生'

  const tagList = context.tags.join('、') || '暂无标签'

  const answerList = context.answers
    .map((a, i) => `  ${i + 1}. ${a.question}\n     回答：${a.answer}`)
    .join('\n') || '暂无问答'

  return `你是一位专业的个人形象文案师，需要根据用户的标签和问答，生成一段吸引人的个人介绍文字。

【内容安全约束】
- 严禁任何性暗示、性骚扰诱导、低俗身体描述、开黄腔
- 严禁使用任何带有性含义的双关语或身体部位隐喻
- 严禁出现诱导性语言、暧昧比喻
- 保持积极、真诚、健康的交友基调
- 用阳光温暖的语言风格

--- 用户信息 ---
昵称：${context.nickname}
性别：${genderText}
年龄：${context.age}岁

个人标签：${tagList}

问答内容：
${answerList}

请生成一段自我介绍式文字，返回严格 JSON 格式（不要包含 markdown 代码块标记）：

{
  "summary": "一句话概括（20字以内），如'热爱生活的阳光男生，期待遇见志同道合的TA'",
  "content": "完整画像文字（80-150字），第一人称，语气温暖真诚。融合标签和问答内容，像朋友介绍自己一样自然。不要逐条罗列标签，而是自然流畅地串联起来。比如：'我是一个热爱旅行和摄影的男生，周末喜欢探索城市角落，用镜头记录美好瞬间。希望能遇到一个同样热爱生活、愿意一起看世界的她~'"
}

要求：
- summary 控制在20字以内，精炼有记忆点
- content 80-150字，第一人称，自然流畅
- 基于真实标签和问答，不编造虚假信息
- 语言温暖、真诚、不浮夸

【再次强调】严格禁止任何形式的性暗示和低俗内容，请保持健康积极的交友基调。只返回纯 JSON。`
}

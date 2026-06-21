export interface UserBase {
  id: number
  nickname: string
  avatar: string
  age?: number
  gender?: number
  city?: string
  isVip?: number
  isRealName?: number
}

export interface LikeItem extends UserBase {
  createdAt: string
}

export interface MatchItem extends UserBase {
  lastMessage?: string
}

export interface DailyRecommend {
  list: UserBase[]
  remaining: number
  refreshTime: string
}

export interface VoiceIntro {
  voiceUrl: string
  duration: number
  auditStatus: 0 | 1 | 2
}

export interface AiMatchReport {
  score: number
  analysis: string
  tags: string[]
}

export interface AiQuiz {
  question: string
  options: string[]
}

export interface QuestionnaireItem {
  id: number
  title: string
  subtitle: string
  questionCount: number
  coverImage: string
}

export interface QuestionnaireQuestionOption {
  id: number
  text: string
  value: number
}

export interface QuestionnaireQuestion {
  id: number
  content: string
  options: QuestionnaireQuestionOption[]
}

export interface QuestionnaireResult {
  compatibilityScore: number
  resultTitle: string
  resultDesc: string
  sharedTags: string[]
}

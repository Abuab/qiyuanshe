import { DimensionResult } from './personality-scoring'

/** 统一的人格结果视图（登录用户 / 游客共用） */
export interface PersonalityResultView {
  typeCode: string
  typeName: string | null
  nickname: string | null
  summary: string | null
  description: string | null
  /** 四维度雷达图数据：{ 维度code: 0-100 } */
  radar: Record<string, number>
  /** 各维度明细 */
  dimensions: DimensionResult[]
  /** 适配推荐类型编码列表 */
  matchTypes: string[]
  /** 完成测试时间（ISO 字符串） */
  testedAt: string
  /** 是否游客结果 */
  isGuest: boolean
}

/** 他人结果的简化视图（资料卡展示，供匹配参考） */
export interface PersonalitySimpleView {
  typeCode: string
  typeName: string | null
  nickname: string | null
  /** 人格标签（类型名 + 各维度方向标签） */
  tags: string[]
  /** 简化雷达图：{ 维度code: 0-100 } */
  radar: Record<string, number>
}

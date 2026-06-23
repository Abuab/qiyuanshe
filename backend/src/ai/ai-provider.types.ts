/**
 * AI Provider 多源管理 —— 类型定义
 */
import { LoadBalanceStrategy } from '../entities/AiProviderConfig'

// ===================== Provider 运行时快照（Redis 缓存用） =====================

export interface AiProviderSnapshot {
  id: number
  providerKey: string
  displayName: string
  apiBase: string
  modelName: string
  apiKeyPlain: string // 解密后的明文 key
  weight: number
  priority: number
  isEnabled: boolean
  isDefault: boolean
}

// ===================== Redis Key 常量 =====================

/** Provider 列表缓存 key */
export const PROVIDER_LIST_CACHE_KEY = 'ai:provider:list'

/** 当前活跃 Provider ID（故障切换使用） */
export const PROVIDER_ACTIVE_KEY = 'ai:provider:active'

/** 负载均衡策略缓存 key */
export const PROVIDER_STRATEGY_KEY = 'ai:provider:strategy'

/** 故障 Provider 冷却期 key 前缀：ai:provider:cooldown:{providerId} */
export const PROVIDER_COOLDOWN_PREFIX = 'ai:provider:cooldown:'

/** 故障计数 key 前缀：ai:provider:fails:{providerId} */
export const PROVIDER_FAILS_PREFIX = 'ai:provider:fails:'

/** 余额告警通知 key 前缀：ai:provider:alert:notified:{providerId} */
export const PROVIDER_ALERT_PREFIX = 'ai:provider:alert:'

// ===================== 全局配置常量 =====================

/** 故障判定：连续失败次数阈值 */
export const FAILURE_THRESHOLD = 3

/** 故障冷却期（秒） */
export const COOLDOWN_SECONDS = 10 * 60

/** Round-Robin 全局计数器（Redis INCR 多实例共享） */
export const PROVIDER_RR_KEY = 'ai:provider:rr:index'

/** 余额监控间隔（秒） */
export const BALANCE_CHECK_INTERVAL_SECONDS = 30 * 60

/** 余额告警：连续告警次数达到后自动降级 */
export const ALERT_DOWNGRADE_COUNT = 3

/** 余额扣减估算系数（每 1K token 约 $0.00015，按 0.0015 元/千token 估） */
export const TOKEN_PRICE_MAP: Record<string, number> = {
  'deepseek-chat': 0.001,       // DeepSeek 极低价
  'moonshot-v1-8k': 0.012,     // Kimi
  'gpt-4o-mini': 0.0006,       // GPT-4o-mini 输出 $0.6/1M → 0.0006/1K
  'qwen-plus': 0.002,          // 通义千问
  'ernie-4.0': 0.012,          // 文心一言
}

// ===================== 管理后台接口类型 =====================

/** Provider 配置输入（管理后台新增/编辑） */
export interface ProviderConfigInput {
  providerKey: string
  displayName: string
  apiKey: string // 明文，后端加密存储
  apiBase: string
  modelName: string
  isEnabled: boolean
  isDefault: boolean
  weight: number
  priority: number
  balanceQueryUrl?: string
}

/** Provider 配置列表项（返回给管理后台，apiKey 脱敏） */
export interface ProviderConfigVO {
  id: number
  providerKey: string
  displayName: string
  apiKeyMasked: string // 脱敏显示
  apiBase: string
  modelName: string
  isEnabled: number
  isDefault: number
  weight: number
  priority: number
  balanceQueryUrl?: string
  createdAt: string
  updatedAt: string
}

/** 负载均衡策略配置 */
export interface LoadBalanceConfig {
  strategy: LoadBalanceStrategy
  updatedAt: string
  updatedBy?: string
}

/** 余额告警记录 */
export interface BalanceAlertRecord {
  id: number
  providerId: number
  providerName: string
  currentBalance: number
  alertThreshold: number
  alertStatus: string
  alertCount: number
  lastQueryAt?: string
  lastAlertAt?: string
}

/** 成本统计 */
export interface CostStats {
  providerId: number
  providerName: string
  totalCalls: number
  successCalls: number
  failedCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  avgDurationMs: number
}

/** 按功能类型的调用统计 */
export interface CallTypeStats {
  callType: string
  totalCalls: number
  byProvider: Record<string, number>
}

/** 故障转移日志 */
export interface FailoverLog {
  id: number
  providerId: number
  providerName: string
  event: string // 'failure_detected' | 'switched' | 'cooldown_start' | 'cooldown_end' | 'recovered'
  detail: string
  createdAt: string
}

/** 手动切换 Provider 请求 */
export interface SwitchProviderInput {
  providerId: number
  reason?: string
}

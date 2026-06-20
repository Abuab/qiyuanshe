/**
 * 协议同意记录存储类型
 */
export type StorageType = 'local' | 'sls'

/**
 * 存储策略配置（聚合形式）
 */
export interface StorageStrategyConfig {
  /** storageType: local / sls */
  storageType: StorageType
  /** 是否本地双写（SLS 写入时同步写一份到本地表） */
  localBackup: boolean
  /** SLS 项目名 */
  slsProject: string
  /** SLS 日志库名 */
  slsLogstore: string
  /** SLS 地域 endpoint（如 cn-hangzhou.log.aliyuncs.com） */
  slsEndpoint: string
  /** SLS AccessKey ID */
  slsAccessKeyId: string
  /** SLS AccessKey Secret（明文，用于 SDK 调用；存储时加密） */
  slsAccessKeySecret: string
}

/**
 * 协议同意日志数据（与实体对应，但解耦 ORM）
 */
export interface AgreementLogData {
  userId: number
  agreementType: string
  version: string
  action: string
  ipAddress: string
  userAgent: string
  storageSource: StorageType
}

/**
 * 查询过滤参数
 */
export interface AgreementLogQuery {
  userId?: number
  agreementType?: string
  startTime?: string
  endTime?: string
  page?: number
  pageSize?: number
}

/**
 * 导出过滤参数
 */
export interface AgreementLogExport {
  userId?: number
  startTime?: string
  endTime?: string
}

/**
 * 抽象存储策略接口
 */
export interface IAgreementLogStorageStrategy {
  /** 名称标识 */
  readonly name: StorageType

  /** 保存一条同意记录 */
  save(log: AgreementLogData): Promise<{ id: string }>

  /** 分页查询同意记录 */
  query(filters: AgreementLogQuery): Promise<{ items: any[]; total: number }>

  /** 导出为 CSV Buffer */
  export(filters: AgreementLogExport): Promise<Buffer>

  /** 测试连接是否正常 */
  testConnection(): Promise<boolean>

  /** 批量迁移数据（从当前策略迁出） */
  exportAll(filters: AgreementLogExport): Promise<AgreementLogData[]>

  /** 批量导入数据（迁入当前策略） */
  importAll(logs: AgreementLogData[]): Promise<number>
}

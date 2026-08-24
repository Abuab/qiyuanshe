import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { VipOrder } from '../entities/VipOrder'
import { VipPackage } from '../entities/VipPackage'
import { User } from '../entities/User'
import { AuditLog } from '../entities/AuditLog'
import { CreateOrderDto } from './dto'
import { RedisService } from '../common/redis.service'
import * as crypto from 'crypto'

export interface PayParams {
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)
  private readonly mchId: string
  private readonly apiV3Key: string
  private readonly appId: string
  private readonly notifyUrl: string
  private readonly privateKeyPem: string
  private readonly mchSerialNo: string

  constructor(
    @InjectRepository(VipOrder)
    private readonly orderRepository: Repository<VipOrder>,
    @InjectRepository(VipPackage)
    private readonly packageRepository: Repository<VipPackage>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {
    this.mchId = process.env.WECHAT_MCH_ID || ''
    this.apiV3Key = process.env.WECHAT_API_V3_KEY || ''
    this.appId = process.env.WECHAT_APPID || ''
    this.notifyUrl = process.env.WECHAT_NOTIFY_URL || ''
    this.privateKeyPem = (process.env.WECHAT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    this.mchSerialNo = process.env.WECHAT_MCH_SERIAL_NO || ''
  }

  /** 微信支付是否已配置（缺少任一关键参数视为未配置） */
  private isWechatPayConfigured(): boolean {
    return !!(this.mchId && this.appId && this.privateKeyPem && this.mchSerialNo)
  }

  private generateOrderNo(): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(6).toString('hex').toUpperCase()
    return `LT${timestamp}${random}`
  }

  // ===== APIv3 RSA-SHA256 签名 =====
  private signV3(method: string, url: string, timestamp: number, nonceStr: string, body: string): string {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`
    return crypto
      .createSign('RSA-SHA256')
      .update(message)
      .sign(this.privateKeyPem, 'base64')
  }

  /** 生成 Authorization 头 */
  private buildAuthHeader(method: string, url: string, body: string): string {
    const timestamp = Math.floor(Date.now() / 1000)
    const nonceStr = crypto.randomBytes(16).toString('hex')
    const signature = this.signV3(method, url, timestamp, nonceStr, body)
    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${this.mchSerialNo}",signature="${signature}"`
  }

  // ===== 统一下单 =====
  async createOrder(userId: number, dto: CreateOrderDto): Promise<{ orderNo: string; payParams: PayParams }> {
    // 从数据库读取套餐信息
    const packages = await this.packageRepository.find({ where: { status: 1, isDeleted: 0 } })
    const pkg = packages.find(p => p.id === dto.vipPackageId)
    if (!pkg) throw new BadRequestException('无效的会员套餐')
    if (pkg.price <= 0) throw new BadRequestException('套餐价格异常')

    const orderNo = this.generateOrderNo()

    const order = this.orderRepository.create({
      userId,
      orderNo,
      vipLevel: pkg.id,
      packageId: pkg.id,
      amount: pkg.price, // 整数分
      payType: 'wechat',
      status: 0,
    })
    await this.orderRepository.save(order)

    // 未配置微信支付时返回标记，前端应提示"暂不支持支付"
    if (!this.isWechatPayConfigured()) {
      return {
        orderNo,
        payParams: {
          timeStamp: '',
          nonceStr: '',
          package: '',
          signType: '',
          paySign: '',
        },
      }
    }

    const payParams = await this.unifiedOrder(orderNo, pkg.price, pkg.name)
    return { orderNo, payParams }
  }

  /** 真实调用微信支付 V3 JSAPI 统一下单 */
  private async unifiedOrder(orderNo: string, amountCents: number, description: string): Promise<PayParams> {
    const path = '/v3/pay/transactions/jsapi'
    const url = `https://api.mch.weixin.qq.com${path}`

    const body = JSON.stringify({
      appid: this.appId,
      mchid: this.mchId,
      description,
      out_trade_no: orderNo,
      notify_url: this.notifyUrl,
      amount: { total: amountCents, currency: 'CNY' },
      payer: {}, // JSAPI 由小程序传入 openid，此处留空由前端补
    })

    this.logger.log(`[统一下单] orderNo=${orderNo}, amount=${amountCents}分`)

    const auth = this.buildAuthHeader('POST', path, body)
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth },
      body,
    })

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '')
      this.logger.error(`[统一下单] HTTP ${resp.status}: ${errBody}`)
      throw new BadRequestException('微信下单失败，请稍后重试')
    }

    const result = await resp.json() as any
    if (!result.prepay_id) {
      // 仅记录关键错误码，避免日志泄露完整支付响应
      this.logger.error(`[统一下单] 无 prepay_id: errcode=${result?.errcode || 'unknown'} errmsg=${result?.errmsg || ''}`)
      throw new BadRequestException('微信下单失败，未获取到 prepay_id')
    }

    return this.buildJsapiParams(result.prepay_id)
  }

  /** 组装小程序调起支付所需的 payParams（二次签名） */
  private buildJsapiParams(prepayId: string): PayParams {
    const timeStamp = Math.floor(Date.now() / 1000).toString()
    const nonceStr = crypto.randomBytes(16).toString('hex')
    const packageStr = `prepay_id=${prepayId}`

    const message = `${this.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`
    const paySign = crypto
      .createSign('RSA-SHA256')
      .update(message)
      .sign(this.privateKeyPem, 'base64')

    return {
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign,
    }
  }

  // ===== 支付回调处理 =====
  async processNotify(data: any, rawBody?: string, reqHeaders?: Record<string, string>): Promise<string> {
    // 1. 校验签名（仅接受 V3 回调：Wechatpay-* 头 + RSA-SHA256 平台证书验签）
    const signValid = await this.verifyNotifySign(rawBody, reqHeaders)
    if (!signValid) {
      this.logger.error('[回调] 签名校验失败')
      return this.buildNotifyResponse(false, '签名校验失败')
    }

    // 2. 解密 resource 字段，获取订单号与流水号（V3 回调把业务数据加密在 resource.ciphertext）
    const resource = this.decryptNotifyResource(data?.resource)
    if (!resource || !resource.out_trade_no) {
      this.logger.error('[回调] 解密回调数据失败')
      return this.buildNotifyResponse(false, '解密失败')
    }
    const { out_trade_no, transaction_id } = resource

    // 3. 幂等性：Redis 分布式锁
    const lockKey = `pay:notify:lock:${out_trade_no}`
    const lockAcquired = await this.redis.getClient().set(lockKey, '1', 'PX', 30000, 'NX')
    if (!lockAcquired) {
      this.logger.warn(`[回调] 重复通知被拦截: ${out_trade_no}`)
      return this.buildNotifyResponse(true)
    }

    try {
      const order = await this.orderRepository.findOne({ where: { orderNo: out_trade_no, isDeleted: 0 } })
      if (!order) {
        this.logger.error(`[回调] 订单不存在: ${out_trade_no}`)
        return this.buildNotifyResponse(false, '订单不存在')
      }

      if (order.status === 1) {
        this.logger.log(`[回调] 订单已支付，跳过: ${out_trade_no}`)
        return this.buildNotifyResponse(true)
      }

      // 金额校验：回调金额与订单金额（整数分）必须一致，防止篡改
      const totalFee = resource.amount
      const orderAmountCents = Number(order.amount)
      if (totalFee !== orderAmountCents) {
        this.logger.error(`[回调] 金额不匹配: 回调=${totalFee}, 订单=${orderAmountCents} (${out_trade_no})`)
        return this.buildNotifyResponse(false, '金额不匹配')
      }

      const queryRunner = this.dataSource.createQueryRunner()
      await queryRunner.connect()
      await queryRunner.startTransaction()

      try {
        await queryRunner.manager.update(VipOrder, { orderNo: out_trade_no }, { status: 1, paidAt: new Date(), transactionId: transaction_id || '' })

        const pkg = await this.packageRepository.findOne({ where: { id: order.packageId! } })
        const durationDays = pkg?.durationDays ?? 30

        const user = await queryRunner.manager.findOne(User, { where: { id: order.userId } })
        const now = new Date()
        let expireTime: Date

        if (user?.vipExpireTime && new Date(user.vipExpireTime) > now) {
          expireTime = new Date(user.vipExpireTime)
        } else {
          expireTime = now
        }
        // 正确的跨月计算：直接加天数
        expireTime = new Date(expireTime.getTime() + durationDays * 86400000)

        await queryRunner.manager.update(User, { id: order.userId }, {
          vipLevel: order.vipLevel,
          vipExpireTime: expireTime,
          isVip: 1,
          vipPackageName: pkg?.name || '',
        })

        const log = this.auditLogRepository.create({
          action: 'VIP_PURCHASE',
          targetType: 'vip_order',
          targetId: order.id,
          reason: JSON.stringify({ orderNo: out_trade_no, transactionId: transaction_id, vipLevel: order.vipLevel, amount: order.amount }),
        })
        await queryRunner.manager.save(log)
        await queryRunner.commitTransaction()

        this.logger.log(`[回调] 支付成功: ${out_trade_no}`)
        // 清除推荐缓存：VIP 开通影响推荐排序权重
        this.redis.delByPattern('v3:rec:*').catch(() => {})
        this.redis.del(`recommend:score:${order.userId}`).catch(() => {})
      } catch (e) {
        await queryRunner.rollbackTransaction()
        throw e
      } finally {
        await queryRunner.release()
      }

      return this.buildNotifyResponse(true)
    } finally {
      // 释放锁，防止 key 堆积（但不删除——用 TTL 兜底）
      await this.redis.del(lockKey).catch(() => {})
    }
  }

  private buildNotifyResponse(success: boolean, msg = 'OK'): string {
    if (success) {
      return JSON.stringify({ code: 'SUCCESS', message: msg })
    }
    return JSON.stringify({ code: 'FAIL', message: msg })
  }

  /** 解密微信支付 V3 回调的 resource 字段（AEAD_AES_256_GCM），返回业务数据 */
  private decryptNotifyResource(resource: any): { out_trade_no: string; transaction_id: string; amount: number } | null {
    if (!resource || typeof resource !== 'object') {
      this.logger.error('[回调] 缺少 resource 字段')
      return null
    }
    if (resource.algorithm !== 'AEAD_AES_256_GCM') {
      this.logger.error(`[回调] 不支持的加密算法: ${resource.algorithm}`)
      return null
    }
    if (!this.apiV3Key) {
      this.logger.error('[回调] 未配置 WECHAT_API_V3_KEY，无法解密回调数据')
      return null
    }
    try {
      // ciphertext 的末尾 16 字节为 GCM 认证标签，需拆分
      const ciphertext = Buffer.from(resource.ciphertext, 'base64')
      const authTag = ciphertext.subarray(ciphertext.length - 16)
      const data = ciphertext.subarray(0, ciphertext.length - 16)

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.apiV3Key, Buffer.from(resource.nonce, 'base64'))
      decipher.setAuthTag(authTag)
      decipher.setAAD(Buffer.from(resource.associated_data || '', 'utf8'))
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()])

      const result = JSON.parse(decrypted.toString('utf8'))
      return {
        out_trade_no: result.out_trade_no,
        transaction_id: result.transaction_id,
        amount: result.amount?.total ?? 0,
      }
    } catch (e) {
      this.logger.error(`[回调] 解密失败: ${(e as Error).message}`)
      return null
    }
  }

  /** 校验回调签名（仅接受 V3 回调：Wechatpay-* 头 + RSA-SHA256 平台证书验签） */
  private async verifyNotifySign(rawBody?: string, headers?: Record<string, string>): Promise<boolean> {
    if (headers?.['wechatpay-signature'] && rawBody) {
      return this.verifyV3NotifySign(headers, rawBody)
    }
    // 缺少 V3 签名头或原始 Body → 拒绝（不再接受 V2 风格回调）
    this.logger.warn('[回调] 缺少 V3 签名头或原始 Body，已拒绝')
    return false
  }

  /** 校验 V3 回调签名（使用微信平台证书公钥） */
  private verifyV3NotifySign(headers: Record<string, string>, rawBody: string): boolean {
    try {
      const timestamp = headers['wechatpay-timestamp']
      const nonce = headers['wechatpay-nonce']
      const signature = headers['wechatpay-signature']

      if (!timestamp || !nonce || !signature) return false

      const message = `${timestamp}\n${nonce}\n${rawBody}\n`

      // 使用微信平台证书公钥验签（从环境变量获取，支持多个用分号分隔）
      const certPems = (process.env.WECHAT_PLATFORM_CERT_PEM || '')
        .replace(/\\n/g, '\n')
        .split('-----END CERTIFICATE-----')
        .map(s => s.trim().replace(/^;/, '').trim())
        .filter(s => s.includes('-----BEGIN CERTIFICATE-----'))
        .map(s => `${s}\n-----END CERTIFICATE-----`)

      if (certPems.length === 0) {
        this.logger.error('[V3验签] 未配置 WECHAT_PLATFORM_CERT_PEM')
        return false
      }

      for (const pem of certPems) {
        try {
          if (crypto.createVerify('RSA-SHA256').update(message).verify(pem, signature, 'base64')) {
            return true
          }
        } catch { /* 尝试下一张证书 */ }
      }
      return false
    } catch (e) {
      this.logger.error(`[V3验签] 异常: ${(e as Error).message}`)
      return false
    }
  }

  // ===== IP 白名单校验 =====
  isWechatCallbackIp(clientIp: string): boolean {
    if (!clientIp) return false
    // 本地开发环境放行
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') return true
    // 生产环境 fail-closed：未配置白名单时拒绝所有非本地请求
    const whitelistStr = process.env.WECHAT_CALLBACK_IP_WHITELIST
    if (!whitelistStr) {
      this.logger.error('[安全] 未配置 WECHAT_CALLBACK_IP_WHITELIST，拒绝所有外部回调 IP')
      return false
    }
    const entries = whitelistStr.split(',').map(s => s.trim())
    for (const entry of entries) {
      if (entry.includes('/')) {
        if (this.ipInCidr(clientIp, entry)) return true
      } else if (entry === clientIp) {
        return true
      }
    }
    return false
  }

  private ipInCidr(ip: string, cidr: string): boolean {
    const [net, prefix] = cidr.split('/')
    const mask = ~(2 ** (32 - Number(prefix)) - 1)
    return this.ipToInt(ip) >>> 0 === (this.ipToInt(net) & mask) >>> 0
  }

  private ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0)
  }

  // ===== Mock 支付（仅测试/管理员环境） =====
  async mockPay(orderNo: string, userId: number): Promise<void> {
    // 模拟支付仅在非生产环境可用；生产环境硬性禁用，防止误配 MOCK_PAY_ENABLED 绕过真实支付
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('生产环境禁止模拟支付')
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const order = await queryRunner.manager.findOne(VipOrder, { where: { orderNo, userId, status: 0, isDeleted: 0 } })
      if (!order) throw new NotFoundException('订单不存在或已处理')

      const pkg = await this.packageRepository.findOne({ where: { id: order.packageId! } })
      const durationDays = pkg?.durationDays ?? 30

      const now = new Date()
      const user = await queryRunner.manager.findOne(User, { where: { id: userId } })
      let expireTime: Date
      if (user?.vipExpireTime && new Date(user.vipExpireTime) > now) {
        expireTime = new Date(user.vipExpireTime)
      } else {
        expireTime = now
      }
      expireTime = new Date(expireTime.getTime() + durationDays * 86400000)

      await queryRunner.manager.update(VipOrder, { orderNo }, { status: 1, paidAt: new Date() })
      await queryRunner.manager.update(User, { id: userId }, {
        vipLevel: order.vipLevel,
        vipExpireTime: expireTime,
        isVip: 1,
        vipPackageName: pkg?.name || '',
      })

      await queryRunner.commitTransaction()
      this.logger.log(`[模拟支付] orderNo=${orderNo}, userId=${userId}`)
      // 清除推荐缓存：VIP 开通影响推荐排序权重
      this.redis.delByPattern('v3:rec:*').catch(() => {})
      this.redis.del(`recommend:score:${userId}`).catch(() => {})
    } catch (e) {
      await queryRunner.rollbackTransaction()
      throw e
    } finally {
      await queryRunner.release()
    }
  }

  // ===== 查询接口 =====
  async getOrders(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId, isDeleted: 0 },
      relations: ['package'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    })

    const list = orders.map(order => ({
      id: order.id,
      orderNo: order.orderNo,
      vipLevel: order.vipLevel,
      vipName: order.package?.name || '',
      amount: Number(order.amount) / 100, // 分转元展示
      status: order.status,
      paidAt: order.paidAt,
      expireTime: order.paidAt && order.package
        ? new Date(order.paidAt.getTime() + (order.package.durationDays ?? 30) * 86400000)
        : null,
      createdAt: order.createdAt,
    }))

    return { list, total, page, limit }
  }

  async getOrderByNo(orderNo: string, userId?: number) {
    const where: any = { orderNo }
    if (userId) where.userId = userId

    const order = await this.orderRepository.findOne({ where, relations: ['package'] })
    if (!order) throw new NotFoundException('订单不存在')

    const durationDays = order.package?.durationDays ?? 30
    const expireTime = order.paidAt
      ? new Date(order.paidAt.getTime() + durationDays * 86400000)
      : null

    return {
      id: order.id,
      orderNo: order.orderNo,
      vipLevel: order.vipLevel,
      vipName: order.package?.name || '',
      amount: Number(order.amount) / 100, // 分转元展示
      status: order.status,
      paidAt: order.paidAt,
      expireTime,
      createdAt: order.createdAt,
    }
  }
}

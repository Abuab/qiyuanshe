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

/** 微信支付回调 IP 段在 isWechatCallbackIp() 中通过环境变量 WX_CALLBACK_IP_WHITELIST 配置 */

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
    this.mchId = process.env.WX_MCH_ID || ''
    this.apiV3Key = process.env.WX_API_V3_KEY || ''
    this.appId = process.env.WX_APP_ID || ''
    this.notifyUrl = process.env.WX_NOTIFY_URL || ''
    this.privateKeyPem = (process.env.WX_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    this.mchSerialNo = process.env.WX_MCH_SERIAL_NO || ''
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

  /** APIv2 HMAC-SHA256 签名（仅用于 V2 风格的回调验签） */
  private signV2(params: Record<string, string>): string {
    const signStr = Object.keys(params)
      .filter(k => k !== 'sign' && params[k] !== undefined && params[k] !== '')
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&')
    return crypto
      .createHmac('sha256', process.env.WX_API_KEY || '')
      .update(signStr + '&key=' + (process.env.WX_API_KEY || ''))
      .digest('hex')
      .toUpperCase()
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
      this.logger.error(`[统一下单] 无 prepay_id: ${JSON.stringify(result)}`)
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
    const { out_trade_no, transaction_id } = data

    // 幂等性：Redis 分布式锁
    const lockKey = `pay:notify:lock:${out_trade_no}`
    const lockAcquired = await this.redis.getClient().set(lockKey, '1', 'PX', 30000, 'NX')
    if (!lockAcquired) {
      this.logger.warn(`[回调] 重复通知被拦截: ${out_trade_no}`)
      return this.buildNotifyResponse(true)
    }

    try {
      // 校验签名：优先 V3 回调头签名，回退 V2 body sign
      const signValid = await this.verifyNotifySign(data, rawBody, reqHeaders)
      if (!signValid) {
        this.logger.error(`[回调] 签名校验失败: ${out_trade_no}`)
        return this.buildNotifyResponse(false, '签名校验失败')
      }

      const order = await this.orderRepository.findOne({ where: { orderNo: out_trade_no } })
      if (!order) {
        this.logger.error(`[回调] 订单不存在: ${out_trade_no}`)
        return this.buildNotifyResponse(false, '订单不存在')
      }

      if (order.status === 1) {
        this.logger.log(`[回调] 订单已支付，跳过: ${out_trade_no}`)
        return this.buildNotifyResponse(true)
      }

      // 金额校验：订单金额已为整数分，直接比较
      const totalFee = parseInt(String(data.total_fee || data.amount?.total || '0'), 10)
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
        const durationDays = pkg?.durationDays || 30

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

  // ===== 回调签名校验 =====
  private async verifyNotifySign(data: any, rawBody?: string, headers?: Record<string, string>): Promise<boolean> {
    // V3 回调：通过 Wechatpay-* 头校验（RSA-SHA256，使用微信平台证书公钥签名）
    if (headers?.['wechatpay-signature'] && rawBody) {
      return this.verifyV3NotifySign(headers, rawBody)
    }
    // 降级 V2 风格 XML 回调：使用 body.sign + HMAC-SHA256
    if (data?.sign) {
      const received = data.sign
      const calc = this.signV2({ ...data })
      return received === calc
    }
    return false
  }

  /** 校验 V3 回调签名（使用微信平台证书公钥） */
  private verifyV3NotifySign(headers: Record<string, string>, rawBody: string): boolean {
    try {
      const timestamp = headers['wechatpay-timestamp']
      const nonce = headers['wechatpay-nonce']
      const signature = headers['wechatpay-signature']
      const serial = headers['wechatpay-serial']

      if (!timestamp || !nonce || !signature) return false

      const message = `${timestamp}\n${nonce}\n${rawBody}\n`

      // 使用微信平台证书公钥验签（从环境变量获取，支持多个用分号分隔）
      const certPems = (process.env.WX_PLATFORM_CERT_PEM || '')
        .replace(/\\n/g, '\n')
        .split(';END CERTIFICATE-----')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s + (s.endsWith('-----') ? '' : ';END CERTIFICATE-----'))

      for (const pem of certPems) {
        try {
          return crypto
            .createVerify('RSA-SHA256')
            .update(message)
            .verify(pem, signature, 'base64')
        } catch { /* 下一张证书 */ }
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
    // 若未配置白名单环境变量，降级放行
    const whitelistStr = process.env.WX_CALLBACK_IP_WHITELIST
    if (!whitelistStr) return true
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
    const mockPayEnabled = process.env.NODE_ENV !== 'production' || process.env.MOCK_PAY_ENABLED === 'true'
    if (!mockPayEnabled) {
      throw new BadRequestException('生产环境下模拟支付已禁用')
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const order = await queryRunner.manager.findOne(VipOrder, { where: { orderNo, userId, status: 0 } })
      if (!order) throw new NotFoundException('订单不存在或已处理')

      const pkg = await this.packageRepository.findOne({ where: { id: order.packageId! } })
      const durationDays = pkg?.durationDays || 30

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
      where: { userId },
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
        ? new Date(order.paidAt.getTime() + (order.package.durationDays || 30) * 86400000)
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

    const durationDays = order.package?.durationDays || 30
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

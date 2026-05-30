import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { VipOrder } from '../entities/VipOrder'
import { User } from '../entities/User'
import { AuditLog } from '../entities/AuditLog'
import { CreateOrderDto } from './dto'
import * as crypto from 'crypto'

interface VipPackage {
  level: number
  name: string
  price: number
  months: number
}

const VIP_PACKAGES: VipPackage[] = [
  { level: 1, name: '黄金会员', price: 99, months: 1 },
  { level: 2, name: '钻石会员', price: 249, months: 3 },
  { level: 3, name: '至尊VIP', price: 799, months: 12 },
]

export interface PayParams {
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}

@Injectable()
export class PaymentService {
  private readonly mchId: string
  private readonly apiKey: string
  private readonly apiV3Key: string
  private readonly appId: string
  private readonly notifyUrl: string

  constructor(
    @InjectRepository(VipOrder)
    private readonly orderRepository: Repository<VipOrder>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {
    this.mchId = process.env.WX_MCH_ID || ''
    this.apiKey = process.env.WX_API_KEY || ''
    this.apiV3Key = process.env.WX_API_V3_KEY || ''
    this.appId = process.env.WX_APP_ID || ''
    this.notifyUrl = process.env.WX_NOTIFY_URL || ''
  }

  private getPackage(level: number): VipPackage {
    const pkg = VIP_PACKAGES.find(p => p.level === level)
    if (!pkg) {
      throw new BadRequestException('无效的会员等级')
    }
    return pkg
  }

  private generateOrderNo(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10).toUpperCase()
    return `LT${timestamp}${random}`
  }

  private async generateSignature(params: Record<string, string>): Promise<string> {
    const signStr = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')

    const sign = crypto
      .createHmac('sha256', this.apiKey)
      .update(signStr)
      .digest('hex')
      .toUpperCase()

    return sign
  }

  private async generateApiV3Signature(method: string, url: string, body: string): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonceStr = crypto.randomBytes(16).toString('hex')
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`

    const certificate = crypto
      .createPrivateKey(process.env.WX_PRIVATE_KEY || '')
      .export({ format: 'pem', type: 'pkcs8' })

    const signature = crypto
      .createSign('RSA-SHA256')
      .update(message)
      .sign(certificate, 'base64')

    return `${timestamp}\n${nonceStr}\n${signature}`
  }

  async createOrder(userId: number, dto: CreateOrderDto): Promise<{ orderNo: string; payParams: PayParams }> {
    const pkg = this.getPackage(dto.vipLevel)

    const orderNo = this.generateOrderNo()

    const order = this.orderRepository.create({
      userId,
      orderNo,
      vipLevel: dto.vipLevel,
      amount: pkg.price,
      payType: 'wechat',
      status: 0,
    })

    await this.orderRepository.save(order)

    const payParams = await this.unifiedOrder(orderNo, pkg.price, pkg.name)

    return { orderNo, payParams }
  }

  private async unifiedOrder(orderNo: string, totalAmount: number, subject: string): Promise<PayParams> {
    const timeStamp = Math.floor(Date.now() / 1000).toString()
    const nonceStr = crypto.randomBytes(16).toString('hex')

    const payParams: PayParams = {
      timeStamp,
      nonceStr,
      package: `prepay_id=${orderNo}`,
      signType: 'RSA',
      paySign: '',
    }

    const signParams: Record<string, string> = {
      appId: this.appId,
      timeStamp,
      nonceStr,
      package: payParams.package,
      signType: 'RSA',
    }

    payParams.paySign = await this.generateSignature(signParams)

    return payParams
  }

  async processNotify(data: any): Promise<string> {
    const { return_code, return_msg, transaction_id, out_trade_no, total_fee } = data

    if (return_code !== 'SUCCESS') {
      return '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名失败]]></return_msg></xml>'
    }

    const order = await this.orderRepository.findOne({
      where: { orderNo: out_trade_no },
    })

    if (!order) {
      return '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>'
    }

    if (order.status === 1) {
      return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
    }

    if (parseInt(total_fee) !== Math.round(order.amount * 100)) {
      return '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[金额不匹配]]></return_msg></xml>'
    }

    await this.orderRepository.update(
      { orderNo: out_trade_no },
      {
        status: 1,
        paidAt: new Date(),
      }
    )

    const pkg = this.getPackage(order.vipLevel)
    let expireTime = new Date()
    expireTime.setMonth(expireTime.getMonth() + pkg.months)

    const user = await this.userRepository.findOne({
      where: { id: order.userId },
    })

    if (user) {
      if (user.vipExpireTime && user.vipExpireTime > new Date()) {
        const newExpireTime = new Date(user.vipExpireTime)
        newExpireTime.setMonth(newExpireTime.getMonth() + pkg.months)
        expireTime = newExpireTime
      }

      await this.userRepository.update(
        { id: order.userId },
        {
          vipLevel: order.vipLevel,
          vipExpireTime: expireTime,
          isVip: 1,
        }
      )
    }

    const log = this.auditLogRepository.create({
      action: 'VIP_PURCHASE',
      targetType: 'vip_order',
      targetId: order.id,
      reason: JSON.stringify({
        orderNo: out_trade_no,
        transactionId: transaction_id,
        vipLevel: order.vipLevel,
        amount: order.amount,
      }),
    })

    await this.auditLogRepository.save(log)

    return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
  }

  async getOrders(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit

    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    })

    const formattedOrders = orders.map(order => {
      const pkg = this.getPackage(order.vipLevel)
      return {
        id: order.id,
        orderNo: order.orderNo,
        vipLevel: order.vipLevel,
        vipName: pkg.name,
        amount: order.amount,
        status: order.status,
        paidAt: order.paidAt,
        expireTime: order.paidAt
          ? new Date(new Date(order.paidAt).setMonth(new Date(order.paidAt).getMonth() + pkg.months))
          : null,
        createdAt: order.createdAt,
      }
    })

    return {
      list: formattedOrders,
      total,
      page,
      limit,
    }
  }

  async getOrderByNo(orderNo: string, userId?: number) {
    const where: any = { orderNo }
    if (userId) {
      where.userId = userId
    }

    const order = await this.orderRepository.findOne({ where })

    if (!order) {
      throw new NotFoundException('订单不存在')
    }

    const pkg = this.getPackage(order.vipLevel)

    let expireTime = null
    if (order.paidAt) {
      expireTime = new Date(order.paidAt)
      expireTime.setMonth(expireTime.getMonth() + pkg.months)
    }

    return {
      id: order.id,
      orderNo: order.orderNo,
      vipLevel: order.vipLevel,
      vipName: pkg.name,
      amount: order.amount,
      status: order.status,
      paidAt: order.paidAt,
      expireTime,
      createdAt: order.createdAt,
    }
  }
}

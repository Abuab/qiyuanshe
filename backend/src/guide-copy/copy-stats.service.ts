import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { CopySlot } from './entities/CopySlot'
import { CopyItem } from './entities/CopyItem'
import { CopyStat } from './entities/CopyStat'
import { CopyExposureLog } from './entities/CopyExposureLog'
import { beijingDateStr, recentBeijingDates } from './guide-time.util'

/** A/B「胜出文案」判定所需的最小样本量 */
const WINNER_MIN_IMPRESSIONS = 100

@Injectable()
export class CopyStatsService {
  private readonly logger = new Logger(CopyStatsService.name)

  constructor(
    @InjectRepository(CopySlot)
    private readonly slotRepo: Repository<CopySlot>,
    @InjectRepository(CopyItem)
    private readonly itemRepo: Repository<CopyItem>,
    @InjectRepository(CopyStat)
    private readonly statRepo: Repository<CopyStat>,
    @InjectRepository(CopyExposureLog)
    private readonly exposureRepo: Repository<CopyExposureLog>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 上报曝光（带去重）：以「文案位 + userKey + 自然日」为去重键，
   * 同一用户当天重复进入同一文案位只计一次（防刷）；
   * 单次视图内展示的多条文案（全展示模式）各计一次曝光。
   * userKey 为空（匿名且无 visitorId）时不去重，尽力计数。
   */
  async reportExposure(slotId: number, itemIds: number[], userKey: string | null): Promise<void> {
    const ids = Array.from(new Set((itemIds || []).filter((n) => Number.isFinite(n))))
    if (ids.length === 0) return
    const statDate = beijingDateStr()
    if (userKey) {
      try {
        // 去重键为 (slotId, userKey, statDate)，itemId 存代表文案供 A/B 分组
        await this.exposureRepo.insert({ slotId, itemId: ids[0], userKey, statDate })
      } catch (e: any) {
        if (this.isDuplicate(e)) return // 今日该文案位已计过，跳过整次视图
        this.logger.warn(`曝光去重写入失败: ${e?.message}`)
        return
      }
    }
    for (const itemId of ids) {
      await this.incrStat(slotId, itemId, statDate, 1, 0, 0)
    }
  }

  /** 上报点击 */
  async reportClick(slotId: number, itemId: number): Promise<void> {
    await this.incrStat(slotId, itemId, beijingDateStr(), 0, 1, 0)
  }

  /** 上报引导登录成功（登录成功后由客户端携带此前记录的 itemId 回调） */
  async reportLoginConversion(itemId: number): Promise<void> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } })
    if (!item) return
    await this.incrStat(item.slotId, itemId, beijingDateStr(), 0, 0, 1)
  }

  /** 数据看板：文案位下各文案的累计指标 + 近 7 日趋势 + A/B 胜出文案 */
  async getDashboard(slotId: number): Promise<any> {
    const slot = await this.slotRepo.findOne({ where: { id: slotId } })
    if (!slot) return null

    const items = await this.itemRepo.find({
      where: { slotId },
      order: { sort: 'ASC', id: 'ASC' },
    })
    const allStats = await this.statRepo.find({ where: { slotId } })
    const dates = recentBeijingDates(7)
    const recentStats = allStats.filter((s) => dates.includes(String(s.statDate)))

    const itemStats = items.map((it) => {
      const rows = allStats.filter((s) => s.itemId === it.id)
      const impressions = this.sum(rows, 'impressions')
      const clicks = this.sum(rows, 'clicks')
      const conversions = this.sum(rows, 'loginConversions')
      // 趋势按日期对齐
      const recRows = recentStats.filter((s) => s.itemId === it.id)
      const trendImpr = dates.map((d) => this.dayVal(recRows, d, 'impressions'))
      const trendClk = dates.map((d) => this.dayVal(recRows, d, 'clicks'))
      const trendConv = dates.map((d) => this.dayVal(recRows, d, 'loginConversions'))
      return {
        id: it.id,
        mainText: it.mainText,
        subText: it.subText,
        isEnabled: it.isEnabled,
        weight: it.weight,
        impressions,
        clicks,
        conversions,
        ctr: impressions > 0 ? +(clicks / impressions).toFixed(4) : 0,
        conversionRate: impressions > 0 ? +(conversions / impressions).toFixed(4) : 0,
        trend: { impressions: trendImpr, clicks: trendClk, conversions: trendConv },
      }
    })

    // A/B 胜出文案：样本量达标（曝光≥100）中转化率最高
    let winnerItemId: number | null = null
    if (slot.displayMode === 'ab_test') {
      const candidates = itemStats.filter((s) => s.impressions >= WINNER_MIN_IMPRESSIONS)
      if (candidates.length >= 2) {
        candidates.sort((a, b) => b.conversionRate - a.conversionRate || b.ctr - a.ctr)
        winnerItemId = candidates[0].id
      }
    }

    return {
      slot: { id: slot.id, code: slot.code, name: slot.name, displayMode: slot.displayMode },
      dates,
      items: itemStats,
      winnerItemId,
      winnerMinImpressions: WINNER_MIN_IMPRESSIONS,
    }
  }

  /** 并发安全累加（INSERT ... ON DUPLICATE KEY UPDATE） */
  private async incrStat(
    slotId: number,
    itemId: number,
    statDate: string,
    impr: number,
    clk: number,
    conv: number,
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO copy_stats (slotId, itemId, statDate, impressions, clicks, loginConversions)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           impressions = impressions + ?,
           clicks = clicks + ?,
           loginConversions = loginConversions + ?`,
        [slotId, itemId, statDate, impr, clk, conv, impr, clk, conv],
      )
    } catch (e: any) {
      this.logger.warn(`统计累加失败(item=${itemId}): ${e?.message}`)
    }
  }

  private sum(rows: CopyStat[], field: 'impressions' | 'clicks' | 'loginConversions'): number {
    return rows.reduce((s, r) => s + (Number(r[field]) || 0), 0)
  }

  private dayVal(
    rows: CopyStat[],
    date: string,
    field: 'impressions' | 'clicks' | 'loginConversions',
  ): number {
    const row = rows.find((r) => String(r.statDate) === date)
    return row ? Number(row[field]) || 0 : 0
  }

  private isDuplicate(e: any): boolean {
    return e?.errno === 1062 || String(e?.code || '').includes('ER_DUP_ENTRY')
  }
}

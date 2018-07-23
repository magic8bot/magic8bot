import { TradeService } from '@services'
import { TradeStore } from '@stores'

import { sleep } from '@util'

export class Backfiller {
  constructor(private readonly tradeService: TradeService, private readonly tradeStore: TradeStore) {}

  public async backfill(selector: string, days: number) {
    const historyScan = this.tradeService.getHistoryScan()

    const now = new Date().getTime()
    const targetTime = now - 86400000 * days
    const baseTime = now - targetTime

    // this.tradeEvents.emit('start')
    return historyScan === 'backward'
      ? this.backScan(selector, days, targetTime, baseTime)
      : this.forwardScan(selector, targetTime, now)
  }

  private async backScan(selector: string, days: number, targetTime: number, baseTime: number) {
    const trades = await this.tradeService.backfill(selector)

    const oldestTrade = Math.min(...trades.map(({ time }) => time))
    const percent = (baseTime - (oldestTrade - targetTime)) / baseTime

    // this.tradeEvents.emit('update', percent)
    await this.tradeStore.update(selector, trades)

    if (oldestTrade > targetTime) {
      if (this.tradeService.getBackfillRateLimit()) await sleep(this.tradeService.getBackfillRateLimit())
      return this.backScan(selector, days, targetTime, baseTime)
    }

    // this.tradeEvents.emit('done')
    return Math.max(...trades.map(({ time }) => time))
  }

  private async forwardScan(selector: string, startTime: number, now: number, latestTime?: number) {
    const trades = await this.tradeService.backfill(selector, latestTime ? latestTime : startTime)

    if (!trades.length) {
      // return this.tradeEvents.emit('done')
      return
    }

    const newestTime = Math.max(...trades.map(({ time }) => time))
    const percent = (newestTime - startTime) / (now - startTime)

    // this.tradeEvents.emit('update', percent)
    await this.tradeStore.update(selector, trades)

    if (newestTime < now) {
      if (this.tradeService.getBackfillRateLimit()) await sleep(this.tradeService.getBackfillRateLimit())
      return this.forwardScan(selector, startTime, now, newestTime)
    }

    // this.tradeEvents.emit('done')
    return newestTime
  }
}

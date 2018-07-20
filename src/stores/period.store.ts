import { EventEmitter } from 'events'

import { timebucket } from '@util'
import { PeriodItem, TradeItem } from '@lib'

export class PeriodStore {
  public periods: PeriodItem[] = []

  constructor(private readonly period: string) {}

  initPeriods(trades: TradeItem[]) {
    trades.forEach((trade) => this.addTrade(trade))
  }

  addTrade(trade: TradeItem) {
    const { size, price, time } = trade
    const bucket = timebucket(time)
      .resize(this.period)
      .toMilliseconds()

    if (!this.periods.length || this.periods[0].time < bucket) return this.newPeriod(bucket, trade)

    this.periods[0].low = Math.min(price, this.periods[0].low)
    this.periods[0].high = Math.max(price, this.periods[0].high)
    this.periods[0].close = price
    this.periods[0].volume += size

    // this.periodEvents.emit('newTrade')
  }

  newPeriod(bucket: number, { time, size, price }: TradeItem) {
    this.periods.unshift({
      time: bucket,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: size,
    })

    // this.periodEvents.emit('newTrade')
    // this.periodEvents.emit('newPeriod')
  }
}

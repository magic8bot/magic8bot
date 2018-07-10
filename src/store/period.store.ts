import { observable, action, transaction } from 'mobx'
import tb from 'timebucket'

import { TradeItem } from './trade.store'

interface PeriodItem {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export class PeriodStore {
  @observable public periods: PeriodItem[] = []

  constructor(private readonly period: string) {}

  @action
  initPeriods(trades: TradeItem[]) {
    transaction(() => trades.forEach((trade) => this.addTrade(trade)))
  }

  @action
  addTrade(trade: TradeItem) {
    const { size, price, time } = trade
    const bucket = tb(time)
      .resize(this.period)
      .toMilliseconds()

    if (!this.periods.length || this.periods[0].time < bucket) return this.newPeriod(bucket, trade)

    this.periods[0].low = Math.min(price, this.periods[0].low)
    this.periods[0].high = Math.min(price, this.periods[0].high)
    this.periods[0].close = price
    this.periods[0].volume += size
  }

  @action
  newPeriod(bucket: number, { time, size, price }: TradeItem) {
    this.periods.unshift({
      time: bucket,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: size,
    })
  }
}

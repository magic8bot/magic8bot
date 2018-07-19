import { EventEmitter } from 'events'
import { observable, action, transaction } from 'mobx'

import { TradeItem } from './trade.store'
import { timebucket } from '../util'

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
    const bucket = timebucket(time)
      .resize(this.period)
      .toMilliseconds()

    if (!this.periods.length || this.periods[0].time < bucket) return this.newPeriod(bucket, price)

    this.periods[0].low = Math.min(price, this.periods[0].low)
    this.periods[0].high = Math.max(price, this.periods[0].high)
    this.periods[0].close = price
    this.periods[0].volume += size

    // this.periodEvents.emit('newTrade')
  }

  @action
  newPeriod(bucket: number, price: number) {
    this.periods.unshift({
      time: bucket,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
    })

    // this.periodEvents.emit('newTrade')
    // this.periodEvents.emit('newPeriod')
  }
}

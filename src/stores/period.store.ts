import { Trade } from 'ccxt'
import { timebucket } from '@magic8bot/timebucket'
import { EventBusEmitter, EventBusListener } from '@magic8bot/event-bus'
import { PeriodItem, eventBus, EVENT } from '@lib'

export class PeriodStore {
  public periods: PeriodItem[] = []

  private updateEmitter: EventBusEmitter<PeriodItem[]>
  private periodEmitter: EventBusEmitter<PeriodItem[]>

  private tradeEventTimeout: NodeJS.Timer = null

  constructor(private readonly period: string, exchange: string, symbol: string, strategy: string, private readonly lookbackSize = 250) {
    const tradeListener: EventBusListener<Trade> = eventBus.get(EVENT.XCH_TRADE)(exchange)(symbol).listen
    tradeListener((trade: Trade) => this.addTrade(trade))

    this.updateEmitter = eventBus.get(EVENT.PERIOD_UPDATE)(exchange)(symbol).emit
    this.periodEmitter = eventBus.get(EVENT.PERIOD_NEW)(exchange)(symbol).emit
  }

  public initPeriods(trades: Trade[]) {
    trades.sort(({ timestamp: a }, { timestamp: b }) => (a === b ? 0 : a > b ? 1 : -1)).forEach((trade) => this.addTrade(trade))
  }

  public addTrade(trade: Trade) {
    const { amount, price, timestamp } = trade
    const bucket = timebucket(timestamp)
      .resize(this.period)
      .toMilliseconds()

    if (!this.periods.length || this.periods[0].time < bucket) return this.newPeriod(bucket, trade)

    this.periods[0].low = Math.min(price, this.periods[0].low)
    this.periods[0].high = Math.max(price, this.periods[0].high)
    this.periods[0].close = price
    this.periods[0].volume += amount

    this.emitTrades()
  }

  public newPeriod(bucket: number, { amount, price }: Trade) {
    // Events are fired on next tick. Spreading the array will
    // prevent the new period from being injected.
    this.updateEmitter([...this.periods])

    this.periods.unshift({
      close: price,
      high: price,
      low: price,
      open: price,
      time: bucket,
      volume: amount,
      bucket,
    })

    if (this.periods.length >= this.lookbackSize) this.periods.pop()

    this.periodEmitter()
  }

  private emitTrades() {
    clearTimeout(this.tradeEventTimeout)
    this.tradeEventTimeout = setTimeout(() => {
      this.updateEmitter([...this.periods])
    }, 100)
  }
}

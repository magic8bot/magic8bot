import { timebucket } from '@magic8bot/timebucket'
import { PeriodItem, TradeItem, eventBus, EventBusEmitter, EVENT } from '@lib'

export class PeriodStore {
  public periods: PeriodItem[] = []

  private updateEmitter: EventBusEmitter
  private periodEmitter: EventBusEmitter

  private tradeEventTimeout: NodeJS.Timer = null

  constructor(private readonly period: string, exchange: string, selector: string, strategy: string) {
    const eventBusEvent = { exchange, selector, strategy }

    eventBus.subscribe({ event: EVENT.TRADE, exchange, selector }, (trade: TradeItem) => this.addTrade(trade))
    this.updateEmitter = eventBus.register({ event: EVENT.PERIOD_UPDATE, ...eventBusEvent })
    this.periodEmitter = eventBus.register({ event: EVENT.PERIOD_NEW, ...eventBusEvent })
  }

  public initPeriods(trades: TradeItem[]) {
    trades.sort(({ time: a }, { time: b }) => (a === b ? 0 : a > b ? 1 : -1)).forEach((trade) => this.addTrade(trade))
  }

  public addTrade(trade: TradeItem) {
    const { size, price, time } = trade
    const bucket = timebucket(time)
      .resize(this.period)
      .toMilliseconds()

    if (!this.periods.length || this.periods[0].time < bucket) return this.newPeriod(bucket, trade)

    this.periods[0].low = Math.min(price, this.periods[0].low)
    this.periods[0].high = Math.max(price, this.periods[0].high)
    this.periods[0].close = price
    this.periods[0].volume += size

    this.emitTrades()
  }

  public newPeriod(bucket: number, { time, size, price }: TradeItem) {
    // Events are fired on next tick. Speading the array will
    // prevent the new period from being injected.
    this.updateEmitter({ periods: [...this.periods] })

    this.periods.unshift({
      close: price,
      high: price,
      low: price,
      open: price,
      time: bucket,
      volume: size,
    })

    this.periodEmitter()
  }

  private emitTrades() {
    clearTimeout(this.tradeEventTimeout)
    this.tradeEventTimeout = setTimeout(() => {
      this.updateEmitter({ periods: [...this.periods] })
    }, 100)
  }
}

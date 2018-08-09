import { Trade } from 'ccxt'
import { timebucket } from '@magic8bot/timebucket'
import { EventBusEmitter, EventBusListener } from '@magic8bot/event-bus'
import { PeriodItem, eventBus, EVENT } from '@lib'
import { StoreOpts } from '@m8bTypes'

const singleton = Symbol()
const singletonEnforcer = Symbol()

interface PeriodConf {
  period: string
  lookbackSize: number
}

export class PeriodStore {
  public static get instance(): PeriodStore {
    if (!this[singleton]) this[singleton] = new PeriodStore(singletonEnforcer)
    return this[singleton]
  }

  public periods: Map<string, PeriodItem[]> = new Map()

  private periodConfigs: Map<string, PeriodConf> = new Map()
  private updateEmitters: Map<string, EventBusEmitter<PeriodItem[]>> = new Map()
  private periodEmitters: Map<string, EventBusEmitter<PeriodItem[]>> = new Map()
  private tradeEventTimeouts: Map<string, NodeJS.Timer> = new Map()

  constructor(enforcer: Symbol) {
    if (enforcer !== singletonEnforcer) {
      throw new Error('Cannot construct singleton')
    }
  }

  public addSymbol({ exchange, symbol, strategy }: StoreOpts, conf: PeriodConf) {
    const idStr = this.makeIdStr({ exchange, symbol, strategy })
    this.periods.set(idStr, [])
    this.periodConfigs.set(idStr, conf)
    this.tradeEventTimeouts.set(idStr, null)

    const tradeListener: EventBusListener<Trade> = eventBus.get(EVENT.XCH_TRADE)(exchange)(symbol).listen
    tradeListener((trade: Trade) => this.addTrade(idStr, trade))

    this.updateEmitters.set(idStr, eventBus.get(EVENT.PERIOD_UPDATE)(exchange)(symbol)(strategy).emit)
    this.periodEmitters.set(idStr, eventBus.get(EVENT.PERIOD_NEW)(exchange)(symbol)(strategy).emit)
  }

  public addTrade(idStr: string, trade: Trade) {
    const { period } = this.periodConfigs.get(idStr)
    const periods = this.periods.get(idStr)

    const { amount, price, timestamp } = trade
    const bucket = timebucket(timestamp)
      .resize(period)
      .toMilliseconds()

    if (!periods.length || periods[0].time < bucket) return this.newPeriod(idStr, bucket, trade)

    periods[0].low = Math.min(price, periods[0].low)
    periods[0].high = Math.max(price, periods[0].high)
    periods[0].close = price
    periods[0].volume += amount

    this.emitTrades(idStr)
  }

  public newPeriod(idStr: string, bucket: number, { amount, price }: Trade) {
    const { lookbackSize } = this.periodConfigs.get(idStr)
    const periods = this.periods.get(idStr)
    // Events are fired on next tick. Spreading the array will
    // prevent the new period from being injected.
    this.updateEmitters.get(idStr)([...periods])

    periods.unshift({
      close: price,
      high: price,
      low: price,
      open: price,
      time: bucket,
      volume: amount,
      bucket,
    })

    if (periods.length > lookbackSize) periods.pop()

    this.periodEmitters.get(idStr)()
  }

  private emitTrades(idStr: string) {
    clearTimeout(this.tradeEventTimeouts.get(idStr))
    this.tradeEventTimeouts.set(
      idStr,
      setTimeout(() => {
        const periods = this.periods.get(idStr)
        this.updateEmitters.get(idStr)([...periods])
      }, 100)
    )
  }

  private makeIdStr({ exchange, symbol, strategy }: StoreOpts) {
    return `${exchange}.${symbol}.${strategy}`
  }
}

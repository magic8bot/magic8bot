import { Trade } from 'ccxt'
import { timebucket } from '@magic8bot/timebucket'
import { EventBusEmitter, EventBusListener } from '@magic8bot/event-bus'
import { PeriodItem, eventBus, EVENT, wsServer } from '@lib'
import { StoreOpts } from '@m8bTypes'
import { logger } from '../util/logger'

const singleton = Symbol()

interface PeriodConf {
  period: string
  lookbackSize: number
}

enum PERIOD_STATE {
  STOPPED,
  RUNNING,
}

export class PeriodStore {
  public static get instance(): PeriodStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new PeriodStore()
    return this[singleton]
  }

  public periods: Map<string, PeriodItem[]> = new Map()

  private periodConfigs: Map<string, PeriodConf> = new Map()
  private updateEmitters: Map<string, EventBusEmitter<PeriodItem[]>> = new Map()
  private periodEmitters: Map<string, EventBusEmitter<PeriodItem[]>> = new Map()
  private tradeEventTimeouts: Map<string, NodeJS.Timer> = new Map()
  private periodTimer: Map<string, NodeJS.Timer> = new Map()
  private periodStates: Map<string, PERIOD_STATE> = new Map()

  private constructor() {}

  public addSymbol({ exchange, symbol, strategy }: StoreOpts, conf: PeriodConf) {
    const idStr = this.makeIdStr({ exchange, symbol, strategy })
    /* istanbul ignore next */
    if (this.periods.has(idStr)) return

    this.periods.set(idStr, [])
    this.periodConfigs.set(idStr, conf)
    this.tradeEventTimeouts.set(idStr, null)

    const tradeListener: EventBusListener<Trade> = eventBus.get(EVENT.XCH_TRADE)(exchange)(symbol).listen
    /* istanbul ignore next */
    tradeListener((trade: Trade) => this.addTrade(idStr, trade))

    this.updateEmitters.set(idStr, eventBus.get(EVENT.PERIOD_UPDATE)(exchange)(symbol)(strategy).emit)
    this.periodEmitters.set(idStr, eventBus.get(EVENT.PERIOD_NEW)(exchange)(symbol)(strategy).emit)
  }

  /* istanbul ignore next */
  public start(storeOpts: StoreOpts) {
    const idStr = this.makeIdStr(storeOpts)
    this.periodStates.set(idStr, PERIOD_STATE.RUNNING)

    this.periodTimer.set(idStr, setTimeout(() => this.publishPeriod(idStr), this.getPeriodTimeout(idStr)))
  }

  public stop(storeOpts: StoreOpts) {
    const idStr = this.makeIdStr(storeOpts)
    this.periodStates.set(idStr, PERIOD_STATE.RUNNING)
  }

  public addTrade(idStr: string, trade: Trade) {
    if (this.periodStates.get(idStr) !== PERIOD_STATE.RUNNING) return

    const { period } = this.periodConfigs.get(idStr)
    const periods = this.periods.get(idStr)
    const { amount, price, timestamp } = trade
    const bucket = timebucket(timestamp)
      .resize(period)
      .toMilliseconds()

    // aka prerolled data
    const tradeBasedPeriodChange = !periods.length || periods[0].time < bucket

    if (tradeBasedPeriodChange) {
      this.newPeriod(idStr, bucket)
    }

    // special handling if the trade is the first within the period
    if (!periods[0].open) periods[0].open = price
    periods[0].low = !periods[0].low ? price : Math.min(price, periods[0].low)
    periods[0].high = Math.max(price, periods[0].high)
    periods[0].close = price
    periods[0].volume += amount
    this.emitTrades(idStr)
    if (!tradeBasedPeriodChange) return

    // should only happen if timer did something wrong or on Preroll
    this.checkPeriodWithoutTrades(idStr)
    this.emitTradeImmediate(idStr)
    this.periodEmitters.get(idStr)()
  }

  public newPeriod(idStr: string, bucket: number) {
    const { lookbackSize } = this.periodConfigs.get(idStr)
    const periods = this.periods.get(idStr)

    // create an empty period-skeleton
    periods.unshift({
      close: null,
      high: null,
      low: null,
      open: null,
      time: bucket,
      volume: null,
      bucket,
    })

    if (periods.length > lookbackSize) periods.pop()
  }

  public clearPeriods(idStr: string) {
    this.periods.set(idStr, [])
  }

  /**
   * This method is throttling the `PERIOD_UPDATE` events to not result in a calculate call for every trade.
   * Instead its called after 100ms timeout after a trade income was recognized
   * @param idStr period identifier
   */
  private emitTrades(idStr: string) {
    if (this.periodStates.get(idStr) !== PERIOD_STATE.RUNNING) return

    if (this.tradeEventTimeouts.has(idStr)) return
    const fn = () => this.emitTradeImmediate(idStr)
    this.tradeEventTimeouts.set(idStr, setTimeout(fn, 100))
  }

  /**
   * used to emit a immediate `PERIOD_UPDATE` event.
   * Could be used if a period was finished and there is a calculation needed
   * @param idStr period identifier
   */
  private emitTradeImmediate(idStr: string) {
    if (this.periodStates.get(idStr) !== PERIOD_STATE.RUNNING) return

    const periods = this.periods.get(idStr)
    this.updateEmitters.get(idStr)([...periods])
    wsServer.broadcast('period-update', { ...this.parseIdStr(idStr), period: periods[0] })
    /* istanbul ignore else */
    if (this.tradeEventTimeouts.has(idStr)) {
      clearTimeout(this.tradeEventTimeouts.get(idStr))
      this.tradeEventTimeouts.delete(idStr)
    }
  }

  private makeIdStr({ exchange, symbol, strategy }: StoreOpts) {
    return `${exchange}.${symbol}.${strategy}`
  }

  /* istanbul ignore next */
  private getPeriodTimeout(idStr: string) {
    const period = this.periodConfigs.get(idStr).period
    const bucketEnd = timebucket(period).getEndOfBucketMS()
    const now = new Date().getTime()
    logger.silly(`Next ${idStr} period will be published at ${new Date(bucketEnd).toTimeString()}`)
    return bucketEnd > now ? bucketEnd - now : 0
  }

  /* istanbul ignore next */
  private checkPeriodWithoutTrades(idStr: string) {
    if (this.periodStates.get(idStr) !== PERIOD_STATE.RUNNING) return

    const periods = this.periods.get(idStr)
    if (periods.length < 2) return

    const [period, lastPeriod] = periods
    const { close } = lastPeriod

    // period has no open price, so there wasnt any trade.
    if (!period.open && close) {
      period.open = close
      period.high = close
      period.low = close
      period.close = close
      period.volume = 0
      logger.silly(`Emitting PERIOD_UPDATE for empty period without any trade.`)
      this.emitTrades(idStr)
    }
  }

  /* istanbul ignore next */
  private publishPeriod(idStr: string) {
    clearTimeout(this.periodTimer.get(idStr))
    if (this.periodStates.get(idStr) !== PERIOD_STATE.RUNNING) return

    this.checkPeriodWithoutTrades(idStr)
    // Publish period to event bus
    this.periodEmitters.get(idStr)()
    wsServer.broadcast('period-new', { ...this.parseIdStr(idStr), period: this.periods.get(idStr)[0] })
    // prepare new period
    this.newPeriod(idStr, timebucket(this.periodConfigs.get(idStr).period).toMilliseconds())

    const fn = () => this.publishPeriod(idStr)
    this.periodTimer.set(idStr, setTimeout(fn, this.getPeriodTimeout(idStr)))
  }

  private parseIdStr(idStr: string): StoreOpts {
    const [exchange, symbol, strategy] = idStr.split('.')
    return { exchange, symbol, strategy }
  }
}

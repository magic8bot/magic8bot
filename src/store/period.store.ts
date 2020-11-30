import { Trade } from 'ccxt'
import { timebucket } from '@magic8bot/timebucket'
import { EventBusEmitter, EventBusListener } from '@magic8bot/event-bus'
import { PeriodItem, eventBus, EVENT, wsServer } from '@lib'
import { StoreOpts } from '@m8bTypes'
import { logger } from '../util/logger'

const singleton = Symbol()

interface PeriodConf {
  periods: string[]
  lookbackSize: number
}

enum PERIOD_STATE {
  PREROLL,
  STOPPED,
  RUNNING,
}

export class PeriodStore {
  public static get instance(): PeriodStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new PeriodStore()
    return this[singleton]
  }

  public periods: Map<string, Map<string, PeriodItem[]>> = new Map()

  private periodConfigs: Map<string, PeriodConf> = new Map()
  private updateEmitters: Map<string, Map<string, EventBusEmitter<PeriodItem[]>>> = new Map()
  private periodEmitters: Map<string, Map<string, EventBusEmitter<PeriodItem[]>>> = new Map()
  private tradeEventTimeouts: Map<string, Map<string, NodeJS.Timer>> = new Map()
  private periodTimer: Map<string, Map<string, NodeJS.Timer>> = new Map()
  private periodStates: Map<string, PERIOD_STATE> = new Map()

  private constructor() {}

  public addSymbol({ exchange, symbol, strategy }: StoreOpts, conf: PeriodConf) {
    const idStr = this.makeIdStr({ exchange, symbol, strategy })
    /* istanbul ignore next */
    if (this.periods.has(idStr)) return

    logger.debug(`Adding ${idStr} to period store.`)

    this.periodConfigs.set(idStr, conf)
    this.tradeEventTimeouts.set(idStr, new Map())
    this.periodTimer.set(idStr, new Map())

    this.periodStates.set(idStr, PERIOD_STATE.PREROLL)

    const tradeListener: EventBusListener<Trade> = eventBus.get(EVENT.XCH_TRADE)(exchange)(symbol).listen
    /* istanbul ignore next */
    tradeListener((trade: Trade) => this.addTrade(idStr, trade))

    this.updateEmitters.set(idStr, new Map())
    this.periodEmitters.set(idStr, new Map())
    this.periods.set(idStr, new Map())

    const updateEmitters = this.updateEmitters.get(idStr)
    const periodEmitters = this.periodEmitters.get(idStr)
    const periods = this.periods.get(idStr)

    conf.periods.forEach((period) => {
      // tslint:disable-next-line: no-shadowed-variable
      updateEmitters.set(period, (periods) => eventBus.get(EVENT.PERIOD_UPDATE)(exchange)(symbol)(strategy).emit({ period, periods }))
      periodEmitters.set(period, () => eventBus.get(EVENT.PERIOD_NEW)(exchange)(symbol)(strategy).emit(period))
      periods.set(period, [])
    })
  }

  /* istanbul ignore next */
  public start(storeOpts: StoreOpts) {
    const idStr = this.makeIdStr(storeOpts)
    this.periodStates.set(idStr, PERIOD_STATE.RUNNING)

    const conf = this.periodConfigs.get(idStr)

    conf.periods.forEach((period) => {
      const timer = setTimeout(() => this.publishPeriod(idStr, period), this.getPeriodTimeout(idStr, period))

      this.periodTimer.get(idStr).set(period, timer)
    })
  }

  public stop(storeOpts: StoreOpts) {
    const idStr = this.makeIdStr(storeOpts)
    this.periodStates.set(idStr, PERIOD_STATE.STOPPED)

    const conf = this.periodConfigs.get(idStr)

    conf.periods.forEach((period) => {
      clearTimeout(this.periodTimer.get(idStr).get(period))
    })
  }

  public addTrade(idStr: string, trade: Trade) {
    const periodState = this.periodStates.get(idStr)

    if (periodState === PERIOD_STATE.STOPPED) return

    const conf = this.periodConfigs.get(idStr)
    conf.periods.forEach((period) => {
      const periods = this.periods.get(idStr).get(period)
      const { amount, price, timestamp } = trade
      const bucket = timebucket(timestamp).resize(period).toMilliseconds()

      // aka prerolled data
      const tradeBasedPeriodChange = !periods.length || periods[0].time < bucket

      if (tradeBasedPeriodChange) this.newPeriod(idStr, period, bucket)

      // special handling if the trade is the first within the period
      if (!periods[0].open) periods[0].open = price
      periods[0].low = !periods[0].low ? price : Math.min(price, periods[0].low)
      periods[0].high = Math.max(price, periods[0].high)
      periods[0].close = price
      periods[0].volume += amount
      this.emitTrades(idStr, period)
      if (!tradeBasedPeriodChange) return

      // should only happen if timer did something wrong or on Preroll
      this.checkPeriodWithoutTrades(idStr, period)
      this.emitTradeImmediate(idStr, period)
      this.periodEmitters.get(idStr).get(period)()
    })
  }

  public newPeriod(idStr: string, period: string, bucket: number) {
    const { lookbackSize } = this.periodConfigs.get(idStr)
    const periods = this.periods.get(idStr).get(period)

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

  public clearPeriods(idStr: string, period: string) {
    this.periods.get(idStr).set(period, [])
  }

  /**
   * This method is throttling the `PERIOD_UPDATE` events to not result in a calculate call for every trade.
   * Instead its called after 100ms timeout after a trade income was recognized
   * @param idStr period identifier
   */
  private emitTrades(idStr: string, period: string) {
    if (this.periodStates.get(idStr) === PERIOD_STATE.STOPPED) return

    if (this.tradeEventTimeouts.get(idStr).has(period)) return
    const fn = () => this.emitTradeImmediate(idStr, period)
    this.tradeEventTimeouts.get(idStr).set(period, setTimeout(fn, 100))
  }

  /**
   * used to emit a immediate `PERIOD_UPDATE` event.
   * Could be used if a period was finished and there is a calculation needed
   * @param idStr period identifier
   */
  private emitTradeImmediate(idStr: string, period: string) {
    if (this.periodStates.get(idStr) === PERIOD_STATE.STOPPED) return

    const periods = this.periods.get(idStr).get(period)
    this.updateEmitters.get(idStr).get(period)([...periods])

    // @todo(notVitaliy): Find a better place for this
    wsServer.broadcast('period-update', { ...this.parseIdStr(idStr), period: periods[0] })

    /* istanbul ignore else */
    if (this.tradeEventTimeouts.get(idStr).has(period)) {
      clearTimeout(this.tradeEventTimeouts.get(idStr).get(period))
      this.tradeEventTimeouts.get(idStr).delete(period)
    }
  }

  private makeIdStr({ exchange, symbol, strategy }: StoreOpts) {
    return `${exchange}.${symbol}.${strategy}`
  }

  /* istanbul ignore next */
  private getPeriodTimeout(idStr: string, period: string) {
    const bucketEnd = timebucket(period).getEndOfBucketMS()
    const now = new Date().getTime()
    logger.silly(`Next ${idStr} period will be published at ${new Date(bucketEnd).toTimeString()}`)
    return bucketEnd > now ? bucketEnd - now : 0
  }

  /* istanbul ignore next */
  private checkPeriodWithoutTrades(idStr: string, period: string) {
    if (this.periodStates.get(idStr) === PERIOD_STATE.STOPPED) return

    const periods = this.periods.get(idStr).get(period)
    if (periods.length < 2) return

    const [thisPeriod, lastPeriod] = periods
    const { close } = lastPeriod

    // period has no open price, so there wasnt any trade.
    if (!thisPeriod.open && close) {
      thisPeriod.open = close
      thisPeriod.high = close
      thisPeriod.low = close
      thisPeriod.close = close
      thisPeriod.volume = 0
      logger.silly(`Emitting PERIOD_UPDATE for empty period without any trade.`)
      this.emitTrades(idStr, period)
    }
  }

  /* istanbul ignore next */
  private publishPeriod(idStr: string, period: string) {
    clearTimeout(this.periodTimer.get(idStr).get(period))
    if (this.periodStates.get(idStr) === PERIOD_STATE.STOPPED) return

    this.checkPeriodWithoutTrades(idStr, period)
    // Publish period to event bus
    this.periodEmitters.get(idStr).get(period)()

    // @todo(notVitaliy): Find a better place for this
    wsServer.broadcast('period-new', { ...this.parseIdStr(idStr), period: this.periods.get(idStr).get(period)[0] })

    // prepare new period
    this.newPeriod(idStr, period, timebucket(period).toMilliseconds())

    const fn = () => this.publishPeriod(idStr, period)
    this.periodTimer.get(idStr).set(period, setTimeout(fn, this.getPeriodTimeout(idStr, period)))
  }

  private parseIdStr(idStr: string): StoreOpts {
    const [exchange, symbol, strategy] = idStr.split('.')
    return { exchange, symbol, strategy }
  }
}

import { ExchangeConf } from '@m8bTypes'
import { ExchangeService, StrategyService, TradeService } from '@services'
import { TradeStore } from '@stores'
import { sleep, objectifySelector } from '@util'

export class Engine {
  private exchangeService: ExchangeService
  private tradeStore: TradeStore
  private tradeService: TradeService
  private backfillers: Map<string, number> = new Map()

  private strategies: Map<string, StrategyService> = new Map()

  constructor({ exchangeName, auth, options, ...exchangeConf }: ExchangeConf, isPaper: boolean) {
    this.exchangeService = new ExchangeService(exchangeName, auth, isPaper)
    this.tradeStore = new TradeStore()
    this.tradeService = new TradeService(this.exchangeService)

    const currencyPairDays = options.strategies.reduce((acc, { days, selector }) => {
      if (!acc[selector]) acc[selector] = days ? days : options.base.days
      else if (acc[selector] < days) acc[selector] = days
      return acc
    }, {})

    options.strategies.forEach(({ strategyName, share, period, selector, ...strategyConf }) => {
      const selectorStr = `${exchangeName.toLowerCase()}.${selector}`
      const { productId } = objectifySelector(selectorStr)

      if (!this.backfillers.has(selectorStr)) this.backfillers.set(selectorStr, currencyPairDays[selector])

      this.tradeStore.addSelector(selectorStr)
      this.tradeService.addSelector(selectorStr, productId)
      this.strategies.set(selectorStr, new StrategyService(strategyName, period))
    })
  }

  public async init() {
    this.backfillers.forEach(async (days, selector) => {
      await this.backfill(selector, days)

      this.strategies.forEach(
        (strategy, strategySelector) => selector === strategySelector && this.tick(selector, strategy)
      )
    })
  }

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

  public async tick(selector: string, strategy: StrategyService) {
    //
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

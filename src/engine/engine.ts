import { ExchangeConf } from '@m8bTypes'
import { ExchangeService } from '../services/exchange.service'
import { StrategyService } from '../services/strategy.service'
import { TradeStore } from '../store/trade.store'
import { TradeService } from '../services/trades.service'
import { sleep } from '../util'
import objectifySelector from '../util/objectify-selector'

enum BACKFILL_STATUS {
  INIT,
  RUNNING,
  DONE,
}

class BackfillState {
  constructor(public days: number, public status: BACKFILL_STATUS) {}
}

export class Engine {
  private exchangeService: ExchangeService
  private tradeStore: TradeStore
  private tradeService: TradeService
  private backfillers: Map<string, BackfillState> = new Map()

  private strategies: Map<string, StrategyService> = new Map()

  constructor({ exchangeName, auth, options, ...exchangeConf }: ExchangeConf, isPaper: boolean) {
    console.log({ exchangeName })
    this.exchangeService = new ExchangeService(exchangeName, auth, isPaper)
    this.tradeStore = new TradeStore()
    this.tradeService = new TradeService(this.exchangeService)

    options.strategies
      .forEach(({ selector, ...strategyConf }) => {
        const selectorStr = `${exchangeName.toLowerCase()}.${selector}`
        if (!this.backfillers.has(selectorStr)) {
          this.backfillers.set(selectorStr, new BackfillState(strategyConf.days || options.base.days, BACKFILL_STATUS.INIT))
        }
      })

    options.strategies.forEach(({ strategyName, share, period, selector, ...strategyConf }) => {
      const selectorStr = `${exchangeName.toLowerCase()}.${selector}`
      const selectorObj = objectifySelector(selectorStr)

      this.tradeStore.addSelector(selectorStr)
      this.tradeService.addSelector(selectorStr, selectorObj.product_id)
      this.strategies.set(selectorStr, new StrategyService(strategyName, period))
    })
  }

  async init() {
    this.backfillers.forEach(async (backfillState, selector) => {
      backfillState.status = BACKFILL_STATUS.RUNNING
      await this.backfill(selector, backfillState.days)
      backfillState.status = BACKFILL_STATUS.DONE

      // tick every strategy with the given selector
      this.strategies.forEach((strategy, strategySelector) => {
        if (selector == strategySelector)
          this.tick(selector, strategy)
      })
    })
  }

  async backfill(selector: string, days: number) {
    const historyScan = this.tradeService.getHistoryScan()

    const now = new Date().getTime()
    const targetTime = now - 86400000 * days
    const baseTime = now - targetTime

    // this.tradeEvents.emit('start')
    return historyScan === 'backward'
      ? await this.backScan(selector, days, targetTime, baseTime)
      : await this.forwardScan(selector, targetTime, now)
  }

  private async backScan(selector: string, days: number, targetTime: number, baseTime: number) {
    const trades = await this.tradeService.backfill(selector)

    const oldestTrade = Math.min(...trades.map(({ time }) => time))
    const percent = (baseTime - (oldestTrade - targetTime)) / baseTime

    // this.tradeEvents.emit('update', percent)
    await this.tradeStore.update(selector, trades)

    if (oldestTrade > targetTime) {
      if (this.tradeService.getBackfillRateLimit()) await sleep(this.tradeService.getBackfillRateLimit())
      return await this.backScan(selector, days, targetTime, baseTime)
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
      return await this.forwardScan(selector, startTime, now, newestTime)
    }

    // this.tradeEvents.emit('done')
    return newestTime
  }

  async tick(selector: string, strategy: StrategyService) {}
}

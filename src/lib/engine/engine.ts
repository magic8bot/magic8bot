import { ExchangeConf } from '@m8bTypes'
import { ExchangeService, LegacyStrategyService, TradeService } from '@services'
import { TradeStore } from '@stores'
import { objectifySelector } from '@util'

import { Backfiller } from './backfill'

export class Engine {
  private exchangeService: ExchangeService
  private tradeStore: TradeStore
  private tradeService: TradeService

  private backfiller: Backfiller
  private backfillers: Map<string, number> = new Map()

  private strategies: Map<string, LegacyStrategyService> = new Map()

  constructor({ exchangeName, auth, options, ...exchangeConf }: ExchangeConf, isPaper: boolean) {
    this.exchangeService = new ExchangeService(exchangeName, auth, isPaper)
    this.tradeStore = new TradeStore()
    this.tradeService = new TradeService(this.exchangeService)

    this.backfiller = new Backfiller(this.tradeService, this.tradeStore)

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
      this.strategies.set(selectorStr, new LegacyStrategyService(strategyName, period))
    })
  }

  public async init() {
    this.backfillers.forEach(async (days, selector) => {
      await this.backfiller.backfill(selector, days)

      this.strategies.forEach(
        (strategy, strategySelector) => selector === strategySelector && this.tick(selector, strategy)
      )
    })
  }

  public async tick(selector: string, strategy: LegacyStrategyService) {
    //
  }
}

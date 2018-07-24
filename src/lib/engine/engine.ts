import { ExchangeConf, StrategyConf, Base } from '@m8bTypes'
import { ExchangeService, TradeService } from '@services'
import { TradeStore } from '@stores'
import { objectifySelector } from '@util'

import { Backfiller } from './backfill'
import { strategyLoader, BaseStrategy } from '@plugins'

export class Engine {
  private exchangeName: string

  private exchangeService: ExchangeService
  private tradeService: TradeService

  private baseConf: Base

  private backfiller: Backfiller
  private backfillers: Map<string, number> = new Map()

  private strategies: Map<string, Set<BaseStrategy>> = new Map()

  constructor(
    private readonly tradeStore: TradeStore,
    { exchangeName, auth, options: { strategies, base } }: ExchangeConf,
    isPaper: boolean
  ) {
    this.exchangeName = exchangeName
    this.baseConf = base

    this.exchangeService = new ExchangeService(this.exchangeName, auth, isPaper)
    this.tradeService = new TradeService(this.exchangeService)

    this.backfiller = new Backfiller(this.exchangeName, this.tradeService, this.tradeStore)

    const currencyPairDays = this.getBackfillerDays(strategies, base.days)

    strategies.forEach(({ selector }) => this.setupBackfillers(currencyPairDays[selector], selector))
    strategies.forEach((strategyConf) => this.setupStrategies(strategyConf))
  }

  public async init() {
    this.backfillers.forEach(async (days, selector) => {
      await this.backfiller.backfill(selector, days)

      this.strategies.get(selector).forEach((strategy) => strategy.prerollDone())
      this.tick(selector)
    })
  }

  private getBackfillerDays(strategies: StrategyConf[], baseDays: number): Record<string, number> {
    return strategies.reduce((acc, { days, selector }) => {
      if (!acc[selector]) acc[selector] = days ? days : baseDays
      else if (acc[selector] < days) acc[selector] = days
      return acc
    }, {})
  }

  private setupBackfillers(days: number, selector: string) {
    if (!this.backfillers.has(selector)) this.backfillers.set(selector, days)

    const { productId } = objectifySelector(`${this.exchangeName}.${selector}`)
    this.tradeService.addSelector(selector, productId)
    this.tradeStore.addSelector(this.exchangeName, selector)
  }

  private setupStrategies(strategyConf: StrategyConf) {
    const fullConf = this.mergeConfig(strategyConf)
    const strategy = strategyLoader(fullConf.strategyName)

    const { selector } = fullConf

    if (!this.strategies.has(selector)) this.strategies.set(selector, new Set())
    const set = this.strategies.get(selector)

    set.add(new strategy(this.exchangeName, selector, strategyConf))
  }

  private mergeConfig(strategyConf: StrategyConf): StrategyConf {
    return { ...this.baseConf, ...strategyConf }
  }

  private async tick(selector: string) {
    //
  }
}

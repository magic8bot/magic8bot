import { ExchangeConf, StrategyConf, Base } from '@m8bTypes'
import { TradeStore, MarkerStore, WalletStore } from '@stores'
import { ExchangeProvider } from '@exchange'
import { StrategyProvider } from '@strategy'

import { Backfiller } from './backfill'

export class Engine {
  private exchangeName: string

  private baseConf: Base

  private backfiller: Backfiller
  private backfillers: Map<string, number> = new Map()

  private strategies: Map<string, Set<StrategyProvider>> = new Map()

  constructor(
    private readonly exchangeProvider: ExchangeProvider,
    private readonly walletStore: WalletStore,
    private readonly tradeStore: TradeStore,
    private readonly markerStore: MarkerStore,
    { exchangeName, options: { strategies, base } }: ExchangeConf,
    isPaper: boolean
  ) {
    this.exchangeName = exchangeName
    this.baseConf = base

    this.backfiller = new Backfiller(this.exchangeName, this.exchangeProvider, this.tradeStore, this.markerStore)

    const currencyPairDays = this.getBackfillerDays(strategies, base.days)

    strategies.forEach(({ symbol }) => this.setupBackfillers(currencyPairDays[symbol], symbol))
    strategies.forEach((strategyConf) => this.setupStrategies(strategyConf))
  }

  public async init() {
    this.backfillers.forEach(async (days, symbol) => {
      await this.backfiller.backfill(symbol, days)

      this.strategies.get(symbol).forEach((strategy) => {
        strategy.prerollDone()
        strategy.tick()
      })
    })
  }

  private getBackfillerDays(strategies: StrategyConf[], baseDays: number): Record<string, number> {
    return strategies.reduce((acc, { days, symbol }) => {
      if (!acc[symbol]) acc[symbol] = days ? days : baseDays
      else if (acc[symbol] < days) acc[symbol] = days
      return acc
    }, {})
  }

  private setupBackfillers(days: number, symbol: string) {
    if (!this.backfillers.has(symbol)) this.backfillers.set(symbol, days)

    this.tradeStore.addSymbol(this.exchangeName, symbol)
  }

  private setupStrategies(strategyConf: StrategyConf) {
    const fullConf = this.mergeConfig(strategyConf)

    const { symbol } = fullConf

    if (!this.strategies.has(symbol)) this.strategies.set(symbol, new Set())
    const set = this.strategies.get(symbol)

    set.add(new StrategyProvider(this.walletStore, this.exchangeName, symbol, strategyConf))
  }

  private mergeConfig(strategyConf: StrategyConf): StrategyConf {
    return { ...this.baseConf, ...strategyConf }
  }
}

import { ExchangeConf, StrategyConf, Base } from '@m8bTypes'
import { TradeStore, MarkerStore, WalletStore } from '@stores'
import { ExchangeProvider } from '@exchange'

import { TradeEngine } from './trade'
import { StrategyEngine } from './strategy'
import { sleep } from '@util'

export class ExchangeEngine {
  private exchangeName: string

  private baseConf: Base

  private tradeEngine: TradeEngine
  private tradeEngineOpts: Map<string, number> = new Map()

  private strategyEngines: Map<string, Set<StrategyEngine>> = new Map()

  constructor(
    private readonly exchangeProvider: ExchangeProvider,
    private readonly walletStore: WalletStore,
    private readonly tradeStore: TradeStore,
    private readonly markerStore: MarkerStore,
    { exchangeName, tradePollInterval, options: { strategies, base } }: ExchangeConf,
    isPaper: boolean
  ) {
    this.exchangeName = exchangeName
    this.baseConf = base

    this.tradeEngine = new TradeEngine(
      this.exchangeName,
      this.exchangeProvider,
      this.tradeStore,
      this.markerStore,
      tradePollInterval
    )

    const currencyPairDays = this.getBackfillerDays(strategies, base.days)

    strategies.forEach(({ symbol }) => this.setupBackfillers(currencyPairDays[symbol], symbol))
    strategies.forEach((strategyConf) => this.setupStrategies(strategyConf))
  }

  public async init() {
    await this.initWallets()

    this.backfill()
  }

  private async initWallets() {
    const balances = await this.exchangeProvider.getBalances(this.exchangeName)

    this.strategyEngines.forEach(async (strategyEngines) =>
      strategyEngines.forEach((strategyEngine) => strategyEngine.init(balances))
    )
  }

  private backfill() {
    this.tradeEngineOpts.forEach(async (days, symbol) => {
      await this.tradeEngine.scan(symbol, days)
      this.strategyEngines.get(symbol).forEach((strategyEngine) => strategyEngine.run())
      this.tradeEngine.tick(symbol)
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
    if (!this.tradeEngineOpts.has(symbol)) this.tradeEngineOpts.set(symbol, days)

    this.tradeStore.addSymbol(this.exchangeName, symbol)
  }

  private setupStrategies(strategyConf: StrategyConf) {
    const fullConf = this.mergeConfig(strategyConf)

    const { symbol } = fullConf

    if (!this.strategyEngines.has(symbol)) this.strategyEngines.set(symbol, new Set())
    const strategyEngines = this.strategyEngines.get(symbol)

    strategyEngines.add(
      new StrategyEngine(this.exchangeProvider, this.walletStore, this.exchangeName, symbol, fullConf)
    )
  }

  private mergeConfig(strategyConf: StrategyConf): StrategyConf {
    return { ...this.baseConf, ...strategyConf }
  }
}

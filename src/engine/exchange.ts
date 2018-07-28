import { ExchangeConf, StrategyConf, Base } from '@m8bTypes'
import { TradeStore, MarkerStore, WalletStore } from '@stores'
import { ExchangeProvider } from '@exchange'

import { TradeEngine } from './trade'
import { StrategyEngine } from './strategy'
import { sleep } from '@util'

export class ExchangeEngine {
  private exchangeName: string
  private tradePollInterval: number

  private baseConf: Base

  private backfiller: TradeEngine
  private backfillers: Map<string, number> = new Map()

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
    this.tradePollInterval = tradePollInterval
    this.baseConf = base

    this.backfiller = new TradeEngine(this.exchangeName, this.exchangeProvider, this.tradeStore, this.markerStore)

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
    this.backfillers.forEach(async (days, symbol) => {
      await this.backfiller.backfill(symbol, days)
      this.strategyEngines.get(symbol).forEach((strategyEngine) => strategyEngine.run())
      this.tick(symbol)
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

    if (!this.strategyEngines.has(symbol)) this.strategyEngines.set(symbol, new Set())
    const strategyEngines = this.strategyEngines.get(symbol)

    strategyEngines.add(new StrategyEngine(this.walletStore, this.exchangeName, symbol, strategyConf))
  }

  private mergeConfig(strategyConf: StrategyConf): StrategyConf {
    return { ...this.baseConf, ...strategyConf }
  }

  private async tick(symbol: string) {
    await this.backfiller.backfill(symbol, 1)
    await sleep(this.tradePollInterval)
    this.tick(symbol)
  }
}

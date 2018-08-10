import { ExchangeConf, StrategyConf, Base } from '@m8bTypes'
import { TradeStore } from '@store'
import { ExchangeProvider } from '@exchange'

import { StrategyCore } from '@core'
import { TradeEngine } from '@engine'
import { logger } from '@util'

export class ExchangeCore {
  private exchangeName: string

  private baseConf: Base

  private tradeEngine: TradeEngine
  private tradeEngineOpts: Map<string, number> = new Map()

  private strategyCores: Map<string, Set<StrategyCore>> = new Map()

  private readonly tradeStore = TradeStore.instance

  constructor(private readonly exchangeProvider: ExchangeProvider, { exchangeName, tradePollInterval, options: { strategies, base } }: ExchangeConf, isPaper: boolean) {
    this.exchangeName = exchangeName
    this.baseConf = base

    this.tradeEngine = new TradeEngine(this.exchangeName, this.exchangeProvider, tradePollInterval)

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

    this.strategyCores.forEach(async (strategyEngines) => strategyEngines.forEach((strategyEngine) => strategyEngine.init(balances)))
  }

  private backfill() {
    this.tradeEngineOpts.forEach(async (days, symbol) => {
      await this.tradeEngine.scan(symbol, days)
      await this.tradeStore.loadTrades({ exchange: this.exchangeName, symbol })
      logger.info(`Backfill for ${this.exchangeName} on ${symbol} completed.`)
      this.strategyCores.get(symbol).forEach((strategyEngine) => strategyEngine.run())
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
    logger.debug(`Setting up Backfiller for Symbol ${symbol} and ${days} days.`)
    this.tradeStore.addSymbol({ exchange: this.exchangeName, symbol })
  }

  private setupStrategies(strategyConf: StrategyConf) {
    const fullConf = this.mergeConfig(strategyConf)

    const { symbol } = fullConf

    if (!this.strategyCores.has(symbol)) this.strategyCores.set(symbol, new Set())
    const strategyEngines = this.strategyCores.get(symbol)

    logger.debug(`Setting up Strategy ${strategyConf.strategyName}`)

    strategyEngines.add(new StrategyCore(this.exchangeProvider, this.exchangeName, symbol, fullConf))
  }

  private mergeConfig(strategyConf: StrategyConf): StrategyConf {
    return { ...this.baseConf, ...strategyConf }
  }
}

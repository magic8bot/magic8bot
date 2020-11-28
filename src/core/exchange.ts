import { StrategyStore, WalletStore } from '@store'
import { ExchangeProvider } from '@exchange'

import { StrategyCore } from '@core'
import { TradeEngine } from '@engine'
import { logger } from '@util'
import { wsServer, ExchangeConfig, StrategyConfig } from '@lib'

import { TickerEngine } from '../engine/ticker'

export class ExchangeCore {
  private exchange: string
  private strategyCores: Map<string, Map<string, StrategyCore>> = new Map()

  private tradeEngine: TradeEngine
  private tickerEngine: TickerEngine

  constructor(private readonly exchangeProvider: ExchangeProvider, { exchange, tradePollInterval }: ExchangeConfig) {
    this.exchange = exchange
    this.tradeEngine = new TradeEngine(this.exchangeProvider, exchange, tradePollInterval)
    this.tickerEngine = new TickerEngine(this.exchangeProvider, this.exchange)
  }

  public async init() {
    const strategies = await StrategyStore.instance.loadAllForExchange(this.exchange)
    strategies.forEach((strategyConfig) => this.addStrategy(strategyConfig))
  }

  public addStrategy(strategyConfig: StrategyConfig) {
    const { symbol, strategy } = strategyConfig
    if (!this.strategyCores.has(symbol)) this.strategyCores.set(symbol, new Map())
    if (this.strategyCores.get(symbol).has(strategy)) return

    const strategyCore = new StrategyCore(this.exchangeProvider, strategyConfig)
    this.strategyCores.get(symbol).set(strategy, strategyCore)
  }

  public updateStrategy(strategyConfig: StrategyConfig) {
    const { symbol, strategy } = strategyConfig
    if (!this.strategyCores.has(symbol)) this.strategyCores.set(symbol, new Map())

    this.strategyCores.get(symbol).get(strategy).update(strategyConfig)
  }

  public deleteStrategy(symbol: string, strategy: string) {
    if (!this.strategyCores.has(symbol) || !this.strategyCores.get(symbol).has(strategy)) return

    const symbols = this.strategyCores.get(symbol)
    symbols.delete(strategy)

    if (symbols.size === 0) {
      this.syncStop(symbol)
      this.tickerStop(symbol)
    }
  }

  public async getBalances() {
    return this.exchangeProvider.getBalances(this.exchange)
  }

  public syncStart(symbol: string, days: number) {
    this.tradeEngine.start(symbol, days)
  }

  public syncStop(symbol: string) {
    this.tradeEngine.stop(symbol)
  }

  public syncState(symbol: string) {
    return this.tradeEngine.getState(symbol)
  }

  public syncIsRunning(symbol: string) {
    return this.tradeEngine.isRunning(symbol)
  }

  public tickerStart(symbol: string) {
    this.tickerEngine.start(symbol)
  }

  public tickerStop(symbol: string) {
    this.tickerEngine.stop(symbol)
  }

  public tickerIsRunning(symbol: string) {
    return this.tickerEngine.isRunning(symbol)
  }

  public strategyStart(symbol: string, strategy: string) {
    if (!this.checkForStrategy(symbol, strategy)) return
    if (!this.tradeEngine.isReady(symbol)) return this.error(`symbol ${symbol} is not ready yet.`)

    // prettier-ignore
    this.strategyCores.get(symbol).get(strategy).start()
  }

  public strategyStop(symbol: string, strategy: string) {
    if (!this.checkForStrategy(symbol, strategy)) return

    // prettier-ignore
    this.strategyCores.get(symbol).get(strategy).stop()
  }

  public strategyKill(symbol: string, strategy: string) {
    if (!this.checkForStrategy(symbol, strategy)) return

    // prettier-ignore
    this.strategyCores.get(symbol).get(strategy).kill()
  }

  public strategyIsRunning(symbol: string, strategy: string) {
    // prettier-ignore
    if (!this.strategyCores.has(symbol) || !this.strategyCores.get(symbol).has(strategy)) return false

    return this.strategyCores.get(symbol).get(strategy).isRunning()
  }

  public async adjustWallet(symbol: string, strategy: string, asset: number, currency: number) {
    if (!this.checkForStrategy(symbol, strategy)) return

    const balances = await this.getBalances()

    const [a, c] = symbol.split('/')
    const assetBalance = balances[a] ? balances[a].total : 0
    const currencyBalance = balances[c] ? balances[c].total : 0

    if (asset > assetBalance) return this.error(`asset ${a} has insufficient funds (${assetBalance})`)
    if (currency > currencyBalance) return this.error(`currency ${currency} has insufficient funds (${currencyBalance})`)

    const wallets = await WalletStore.instance.loadAll(this.exchange)
    const { assetFree, currencyFree } = this.getFreeFunds(wallets, a, c, assetBalance, currencyBalance)

    if (asset > assetFree) return this.error(`asset ${a} does not have enough free funds (${assetFree})`)
    if (currency > currencyFree) return this.error(`currency ${c} does not have enough free funds (${currencyFree})`)

    // prettier-ignore
    await this.strategyCores.get(symbol).get(strategy).adjustStrategyWallet({ asset, currency, type: 'user' })
  }

  private getFreeFunds(wallets, a: string, c: string, assetBalance: number, currencyBalance: number): { assetFree: any; currencyFree: any } {
    return wallets.reduce((acc, wallet) => this.reduceWallet(a, c, acc, wallet), { assetFree: assetBalance, currencyFree: currencyBalance })
  }

  private reduceWallet(a, c, acc, wallet) {
    const [wA, wC] = wallet.symbol.split('/')
    if (a === wA) acc.assetFree -= wallet.asset
    if (c === wC) acc.currencyFree -= wallet.currency
    return acc
  }

  private checkForStrategy(symbol: string, strategy: string) {
    if (!this.strategyCores.has(symbol)) return this.error(`symbol ${symbol} not configured`)
    if (!this.strategyCores.get(symbol).has(strategy)) return this.error(`strategy ${strategy} not configured`)
    return true
  }

  private error(error: string) {
    logger.error(error)
    return { error: `Exchange Error: ${error}` }
  }
}

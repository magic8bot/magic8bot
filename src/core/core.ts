import { SessionStore, ExchangeStore, StrategyStore } from '@store'
import { ExchangeProvider } from '@exchange'
import { ExchangeCore } from './exchange'
import { wsServer, ExchangeConfig, StrategyConfig } from '@lib'
import { CoreHelpers } from './core.helpers'
import * as Adapters from '../exchange/adapters'
import { Strategies } from '../strategy/strategies/strategies'

export class Core {
  private readonly exchangeProvider: ExchangeProvider
  private readonly exchangeCores: Map<string, ExchangeCore> = new Map()
  private readonly helpers: CoreHelpers

  constructor() {
    this.exchangeProvider = new ExchangeProvider()
    this.helpers = new CoreHelpers()
  }

  public async init() {
    this.registerActions()
    await SessionStore.instance.loadSession()
    const exchanges = await ExchangeStore.instance.loadAllWithAuth()

    exchanges.forEach((exchangeConfig) => this.initExchangeCore(exchangeConfig))
  }

  private registerActions() {
    wsServer.registerAction('get-my-config', this.getMyConfig)

    wsServer.registerAction(`get-exchanges`, this.getExchanges)
    wsServer.registerAction(`get-balance`, this.getBalance)
    wsServer.registerAction('add-exchange', this.addExchange)
    wsServer.registerAction('update-exchange', this.updateExchange)
    wsServer.registerAction('delete-exchange', this.deleteExchange)

    wsServer.registerAction(`start-sync`, this.startSync)
    wsServer.registerAction(`stop-sync`, this.stopSync)
    wsServer.registerAction(`start-ticker`, this.startTicker)
    wsServer.registerAction(`stop-ticker`, this.stopTicker)

    wsServer.registerAction(`get-strategies`, this.getStrategies)
    wsServer.registerAction(`add-strategy`, this.addStrategy)
    wsServer.registerAction(`update-strategy`, this.updateStrategy)
    wsServer.registerAction(`delete-strategy`, this.deleteStrategy)
    wsServer.registerAction(`adjust-wallet`, this.adjustWallet)

    wsServer.registerAction(`start-strategy`, this.startStrategy)
    wsServer.registerAction(`stop-strategy`, this.stopStrategy)
  }

  private addExchange = async (exchangeConfig: ExchangeConfig) => {
    if (!this.helpers.checkAddExchangeParams(exchangeConfig)) return

    Object.keys(exchangeConfig)
      .filter((key) => key.includes('auth.'))
      .forEach((key) => {
        if (!exchangeConfig.auth) exchangeConfig.auth = {} as any
        const authKey = key.split('.').pop()

        exchangeConfig.auth[authKey] = exchangeConfig[key]
        delete exchangeConfig[key]
      })

    await ExchangeStore.instance.save(exchangeConfig)
    this.initExchangeCore(exchangeConfig)
    const { auth, ...config } = exchangeConfig
    wsServer.broadcast('add-exchange', { ...config })
  }

  private updateExchange = async (exchangeConfig: Partial<ExchangeConfig>) => {
    await ExchangeStore.instance.save(exchangeConfig as ExchangeConfig)

    const exchange = await this.stopExchange(exchangeConfig.exchange)

    const fullConfig: ExchangeConfig = {
      exchange: exchange.exchange,
      auth: exchange.auth,
      tradePollInterval: exchange.tradePollInterval,
    }

    this.exchangeProvider.replaceExchange(fullConfig)

    const { auth, ...config } = fullConfig
    wsServer.broadcast('update-exchange', { ...config })
  }

  private deleteExchange = async ({ exchange }) => {
    await this.stopExchange(exchange)
    await ExchangeStore.instance.delete(exchange)
    await StrategyStore.instance.deleteAllForExchange(exchange)
    wsServer.broadcast('delete-exchange', { success: true })
  }

  private async stopExchange(name: string) {
    const exchange = await ExchangeStore.instance.loadWithAuth(name)
    const strategies = await StrategyStore.instance.loadAllForExchange(name)
    const exchangeCore = this.exchangeCores.get(exchange.exchange)

    strategies.forEach(({ symbol, strategy }) => {
      if (exchangeCore.syncIsRunning(symbol)) exchangeCore.syncStop(symbol)
      if (exchangeCore.tickerIsRunning(symbol)) exchangeCore.tickerStop(symbol)
      if (exchangeCore.strategyIsRunning(symbol, strategy)) exchangeCore.strategyStop(symbol, strategy)
    })

    return exchange
  }

  private addStrategy = async (strategyConfig: StrategyConfig) => {
    const { exchange } = strategyConfig
    if (!this.checkForExchange(exchange)) return

    await StrategyStore.instance.save(strategyConfig)
    this.exchangeCores.get(exchange).addStrategy(strategyConfig)
    wsServer.broadcast('add-strategy', { ...strategyConfig })
  }

  private updateStrategy = async (strategyConfig: StrategyConfig) => {
    const { exchange, symbol, strategy } = strategyConfig
    if (!this.checkForExchange(exchange)) return

    const exchangeCore = this.exchangeCores.get(exchange)
    const isRunning = exchangeCore.strategyIsRunning(symbol, strategy)

    // @note(notVitaliy): Hot reloading the strategy will not preload it with trade data
    // unless the symbol trade sync is restarted, which is not a good idea since another
    // strategy might be using that same symbol. That will double load the other strategy.
    if (isRunning) exchangeCore.strategyStop(symbol, strategy)
    await StrategyStore.instance.save(strategyConfig)
    exchangeCore.updateStrategy(strategyConfig)
    if (isRunning) exchangeCore.strategyStart(symbol, strategy)

    wsServer.broadcast('update-strategy', { ...strategyConfig })
  }

  private deleteStrategy = async ({ exchange, symbol, strategy }: StrategyConfig) => {
    if (!this.checkForExchange(exchange)) return

    const exchangeCore = this.exchangeCores.get(exchange)
    if (exchangeCore.strategyIsRunning(symbol, strategy)) exchangeCore.strategyStop(symbol, strategy)

    exchangeCore.deleteStrategy(symbol, strategy)
    await StrategyStore.instance.delete(exchange, symbol, strategy)

    wsServer.broadcast('delete-strategy', { exchange, symbol, strategy })
  }

  private getMyConfig = async () => {
    const exchanges = await this.helpers.getExchanges()
    wsServer.broadcast('get-my-config', { exchanges })
  }

  private getBalance = async ({ exchange }) => {
    if (!this.checkForExchange(exchange)) return

    const balance = await this.exchangeCores.get(exchange).getBalances()
    wsServer.broadcast(`get-balance`, { exchange, balance })
  }

  private startSync = async ({ exchange, symbol, days }) => {
    if (!this.checkForExchange(exchange)) return

    this.exchangeCores.get(exchange).syncStart(symbol, days)
  }

  private stopSync = async ({ exchange, symbol }) => {
    if (!this.checkForExchange(exchange)) return

    this.exchangeCores.get(exchange).syncStop(symbol)
  }

  private startStrategy = async ({ exchange, symbol, strategy }) => {
    if (!this.checkForExchange(exchange)) return

    this.exchangeCores.get(exchange).strategyStart(symbol, strategy)
  }

  private stopStrategy = async ({ exchange, symbol, strategy }) => {
    if (!this.checkForExchange(exchange)) return

    this.exchangeCores.get(exchange).strategyStop(symbol, strategy)
  }

  private adjustWallet = async ({ exchange, symbol, strategy, asset, currency }) => {
    if (!this.checkForExchange(exchange)) return

    this.exchangeCores.get(exchange).adjustWallet(symbol, strategy, asset, currency)
  }

  private startTicker = async ({ exchange, symbol }) => {
    this.exchangeCores.get(exchange).tickerStart(symbol)
  }

  private stopTicker = async ({ exchange, symbol }) => {
    this.exchangeCores.get(exchange).tickerStop(symbol)
  }

  private async initExchangeCore(exchangeConfig: ExchangeConfig) {
    const exchangeAdded = await this.exchangeProvider.addExchange(exchangeConfig)
    if (!exchangeAdded) return false

    const exchangeCore = new ExchangeCore(this.exchangeProvider, exchangeConfig)
    await exchangeCore.init()
    this.exchangeCores.set(exchangeConfig.exchange, exchangeCore)

    return true
  }

  private getExchanges() {
    const exchanges = Object.entries(Adapters).reduce((acc, [name, { description, fields }]) => {
      acc[name] = { description, fields }
      return acc
    }, {})
    wsServer.broadcast('get-exchanges', { exchanges })
  }

  private getStrategies() {
    const strategies = Object.entries(Strategies).reduce((acc, [name, strategy]) => {
      console.log(strategy)
      const { description, fields } = strategy
      acc[name] = { description, fields }
      return acc
    }, {})

    wsServer.broadcast('get-strategies', { strategies })
  }

  private checkForExchange(exchange: string) {
    return this.exchangeCores.has(exchange) ? true : this.helpers.error(`exchange ${exchange} not configured`)
  }
}

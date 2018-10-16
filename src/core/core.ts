import { SessionStore, ExchangeStore, StrategyStore, WalletStore } from '@store'
import { ExchangeProvider } from '@exchange'
import { ExchangeCore } from './exchange'
import { ExchangeConfig, StrategyConfig } from '@lib'
import { CoreHelpers } from './core.helpers'
import * as Adapters from '../exchange/adapters'
import { Strategies } from '../strategy/strategies/strategies'
import { logger } from '@util'
import { BaseStrategy } from '@strategy'

class Core {
  private readonly exchangeProvider: ExchangeProvider
  private readonly exchangeCores: Map<string, ExchangeCore> = new Map()
  private readonly helpers: CoreHelpers

  constructor() {
    this.exchangeProvider = new ExchangeProvider()
    this.helpers = new CoreHelpers()
  }

  public async init() {
    await SessionStore.instance.loadSession()
    const exchanges = await ExchangeStore.instance.loadAllWithAuth()
    if (exchanges.length === 0) return logger.warn('No exchanges loaded')
    exchanges.forEach((exchangeConfig) => this.initExchangeCore(exchangeConfig))
  }

  // Exchange
  public getExchanges() {
    return ExchangeStore.instance.loadAll()
  }

  public async addExchange(exchangeConfig: ExchangeConfig) {
    const hasError = this.helpers.checkAddExchangeParams(exchangeConfig)
    if (hasError !== false) return hasError

    // @todo(notVitaliy): Untangle this mess
    // wtf... seriously past Vitaliy
    Object.keys(exchangeConfig)
      .filter((key) => key.includes('auth.'))
      .forEach((key) => {
        if (!exchangeConfig.auth) exchangeConfig.auth = {} as any
        const authKey = key.split('.').pop()

        exchangeConfig.auth[authKey] = exchangeConfig[key]
        delete exchangeConfig[key]
      })

    await ExchangeStore.instance.save(exchangeConfig)
    const exchangeAdded = await this.initExchangeCore(exchangeConfig)
    const { auth, ...config } = exchangeConfig

    return exchangeAdded === true ? config : exchangeAdded
  }

  public async updateExchange(exchangeConfig: Partial<ExchangeConfig>) {
    // @todo(notVitaliy): Do input sanitizing here
    await ExchangeStore.instance.save(exchangeConfig as ExchangeConfig)

    const exchange = await this.stopExchange(exchangeConfig.exchange)

    const fullConfig: ExchangeConfig = {
      exchange: exchange.exchange,
      auth: exchange.auth,
      tradePollInterval: exchange.tradePollInterval,
    }

    this.exchangeProvider.replaceExchange(fullConfig)

    const { auth, ...config } = fullConfig
    return config
  }

  public async deleteExchange({ exchange }) {
    await this.stopExchange(exchange)
    await ExchangeStore.instance.delete(exchange)
    await StrategyStore.instance.deleteAllForExchange(exchange)
    return { success: true }
  }

  public async getSymbols({ exchange }) {
    return this.exchangeProvider.getSymbols(exchange)
  }

  public getBalance({ exchange }) {
    const hasExchange = this.checkForExchange(exchange)

    if (hasExchange !== true) return hasExchange

    return this.exchangeCores.get(exchange).getBalances()
  }

  public listExchanges() {
    return Object.entries(Adapters).map(([name, { description, fields }]) => ({ name, description, fields }))
  }

  public async getSync({ exchange, symbol }) {
    const hasExchange = this.checkForExchange(exchange)

    if (hasExchange !== true) return hasExchange

    const status = this.exchangeCores.get(exchange).syncState(symbol)

    return { status }
  }

  public async startSync({ exchange, symbol, days = 1 }) {
    const hasExchange = this.checkForExchange(exchange)

    if (hasExchange !== true) return hasExchange

    this.exchangeCores.get(exchange).syncStart(symbol, days)

    return { success: true }
  }

  public async stopSync({ exchange, symbol }) {
    const hasExchange = this.checkForExchange(exchange)

    if (hasExchange !== true) return hasExchange

    this.exchangeCores.get(exchange).syncStop(symbol)

    return { success: true }
  }

  // Strategy
  public async getStrategies({ exchange }) {
    const strategies = await StrategyStore.instance.loadAllForExchange(exchange)
    return strategies
  }

  public async addStrategy(strategyConfig: StrategyConfig) {
    const hasError = this.helpers.checkAddStrategyParams(strategyConfig)
    if (hasError !== false) return hasError

    const { exchange } = strategyConfig
    const hasExchange = this.checkForExchange(exchange)
    if (hasExchange !== true) return hasExchange

    await StrategyStore.instance.save(strategyConfig)
    this.exchangeCores.get(exchange).addStrategy(strategyConfig)
    return strategyConfig
  }

  public async updateStrategy(strategyConfig: StrategyConfig) {
    const hasError = this.helpers.checkAddStrategyParams(strategyConfig)
    if (hasError !== false) return hasError
    const { exchange, symbol, strategy } = strategyConfig
    const hasExchange = this.checkForExchange(exchange)

    if (hasExchange !== true) return hasExchange

    const exchangeCore = this.exchangeCores.get(exchange)
    const isRunning = exchangeCore.strategyIsRunning(symbol, strategy)

    // @note(notVitaliy): Hot reloading the strategy will not preload it with trade data
    // unless the symbol trade sync is restarted, which is not a good idea since another
    // strategy might be using that same symbol. That will double load the other strategy.
    if (isRunning) exchangeCore.strategyStop(symbol, strategy)
    await StrategyStore.instance.save(strategyConfig)
    exchangeCore.updateStrategy(strategyConfig)
    if (isRunning) exchangeCore.strategyStart(symbol, strategy)

    return strategyConfig
  }

  public async deleteStrategy({ exchange, symbol, strategy }: StrategyConfig) {
    const hasExchange = this.checkForExchange(exchange)

    if (hasExchange !== true) return hasExchange

    const exchangeCore = this.exchangeCores.get(exchange)
    if (exchangeCore.strategyIsRunning(symbol, strategy)) exchangeCore.strategyStop(symbol, strategy)

    exchangeCore.deleteStrategy(symbol, strategy)
    await StrategyStore.instance.delete(exchange, symbol, strategy)

    return { success: true }
  }

  public listStrategies() {
    const baseFields = BaseStrategy.fields
    return Object.entries(Strategies).map(([name, { description, fields }]) => ({ name, description, fields: [...baseFields, ...fields] }))
  }

  public async startStrategy({ exchange, symbol, strategy }) {
    const hasExchange = this.checkForExchange(exchange)

    if (hasExchange !== true) return hasExchange

    this.exchangeCores.get(exchange).strategyStart(symbol, strategy)

    return { success: true }
  }

  public async stopStrategy({ exchange, symbol, strategy }) {
    const hasExchange = this.checkForExchange(exchange)

    if (hasExchange !== true) return hasExchange

    this.exchangeCores.get(exchange).strategyStop(symbol, strategy)

    return { success: true }
  }

  // Wallet
  public getWallet({ exchange, symbol, strategy }) {
    const hasExchange = this.checkForExchange(exchange)

    if (hasExchange !== true) return hasExchange

    return WalletStore.instance.loadWallet({ exchange, symbol, strategy })
  }

  public async adjustWallet({ exchange, symbol, strategy, asset, currency }) {
    const hasExchange = this.checkForExchange(exchange)

    if (hasExchange !== true) return hasExchange

    return this.exchangeCores.get(exchange).adjustWallet(symbol, strategy, asset, currency)
  }

  // Depracted
  public getMyConfig() {
    return this.helpers.getExchanges()
  }

  // Private
  private async initExchangeCore(exchangeConfig: ExchangeConfig) {
    const exchangeAdded = await this.exchangeProvider.addExchange(exchangeConfig)
    if (exchangeAdded !== true) return exchangeAdded

    const exchangeCore = new ExchangeCore(this.exchangeProvider, exchangeConfig)
    await exchangeCore.init()
    this.exchangeCores.set(exchangeConfig.exchange, exchangeCore)

    return true
  }

  private checkForExchange(exchange: string) {
    return this.exchangeCores.has(exchange) ? true : this.helpers.error(`exchange ${exchange} not configured`)
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
}

export const core = new Core()

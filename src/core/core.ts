import { SessionStore, ExchangeStore, StrategyStore } from '@store'
import { ExchangeProvider } from '@exchange'
import { ExchangeCore } from './exchange'
import { wsServer, ExchangeConfig, StrategyConfig } from '@lib'
import { CoreHelpers } from './core.helpers'

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
    wsServer.registerAction('add-exchange', this.addExchange)
    wsServer.registerAction(`add-strategy`, this.addStrategy)
    wsServer.registerAction('get-my-config', this.getMyConfig)
    wsServer.registerAction(`get-balance`, this.getBalance)
    wsServer.registerAction(`start-sync`, this.startSync)
    wsServer.registerAction(`stop-sync`, this.stopSync)
    wsServer.registerAction(`start-strategy`, this.startStrategy)
    wsServer.registerAction(`stop-strategy`, this.stopStrategy)
    wsServer.registerAction(`adjust-wallet`, this.adjustWallet)
    wsServer.registerAction(`start-ticker`, this.startTicker)
    wsServer.registerAction(`stop-ticker`, this.stopTicker)
  }

  private addExchange = async (exchangeConfig: ExchangeConfig) => {
    if (!this.helpers.checkAddExchangeParams(exchangeConfig)) return

    await ExchangeStore.instance.save(exchangeConfig)
    this.initExchangeCore(exchangeConfig)
    const { auth, ...config } = exchangeConfig
    wsServer.broadcast('add-exchange', { ...config })
  }

  private addStrategy = async (strategyConfig: StrategyConfig) => {
    const { exchange } = strategyConfig
    if (!this.checkForExchange(exchange)) return

    await StrategyStore.instance.save(strategyConfig)
    this.exchangeCores.get(exchange).addStrategy(strategyConfig)
    wsServer.broadcast('add-strategy', { ...strategyConfig })
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

    this.exchangeCores.get(exchange).startSync(symbol, days)
  }

  private stopSync = async ({ exchange, symbol }) => {
    if (!this.checkForExchange(exchange)) return

    this.exchangeCores.get(exchange).stopSync(symbol)
  }

  private startStrategy = async ({ exchange, symbol, strategy }) => {
    if (!this.checkForExchange(exchange)) return

    this.exchangeCores.get(exchange).startStrategy(symbol, strategy)
  }

  private stopStrategy = async ({ exchange, symbol, strategy }) => {
    if (!this.checkForExchange(exchange)) return

    this.exchangeCores.get(exchange).stopStrategy(symbol, strategy)
  }

  private adjustWallet = async ({ exchange, symbol, strategy, asset, currency }) => {
    if (!this.checkForExchange(exchange)) return

    this.exchangeCores.get(exchange).adjustWallet(symbol, strategy, asset, currency)
  }

  private startTicker = async ({ exchange, symbol }) => {
    this.exchangeCores.get(exchange).startTicker(symbol)
  }

  private stopTicker = async ({ exchange, symbol }) => {
    this.exchangeCores.get(exchange).stopTicker(symbol)
  }

  private async initExchangeCore(exchangeConfig: ExchangeConfig) {
    const exchangeAdded = await this.exchangeProvider.addExchange(exchangeConfig)
    if (!exchangeAdded) return false

    const exchangeCore = new ExchangeCore(this.exchangeProvider, exchangeConfig)
    await exchangeCore.init()
    this.exchangeCores.set(exchangeConfig.exchange, exchangeCore)

    return true
  }

  private checkForExchange(exchange: string) {
    return this.exchangeCores.has(exchange) ? true : this.helpers.error(`exchange ${exchange} not configured`)
  }
}

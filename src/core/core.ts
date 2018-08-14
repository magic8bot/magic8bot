import { SessionStore, ExchangeStore, StrategyStore } from '@store'
import { ExchangeProvider } from '@exchange'
import { ExchangeCore } from './exchange'
import { wsServer, ExchangeConfig, StrategyConfig } from '@lib'
import { logger } from '@util'

export class Core {
  private readonly exchangeProvider: ExchangeProvider
  private readonly exchangeCores: Map<string, ExchangeCore> = new Map()

  constructor() {
    this.exchangeProvider = new ExchangeProvider()
    this.registerActions()
  }

  public async init() {
    await SessionStore.instance.loadSession()
    const exchanges = await ExchangeStore.instance.loadAll()

    exchanges.forEach((exchangeConfig) => this.addExchange(exchangeConfig))
  }

  private async addExchange(exchangeConfig: ExchangeConfig) {
    const addSuccess = this.exchangeProvider.addExchange(exchangeConfig)

    if (!addSuccess) return false

    const exchangeCore = new ExchangeCore(this.exchangeProvider, exchangeConfig)
    await exchangeCore.init()
    this.exchangeCores.set(exchangeConfig.exchange, exchangeCore)
    return true
  }

  private registerActions() {
    wsServer.registerAction('add-exchange', (exchangeConfig: ExchangeConfig) => {
      if (!exchangeConfig.exchange) return this.error('exchange name is required')
      if (!exchangeConfig.auth) return this.error('auth is required')
      if (!exchangeConfig.auth.apiKey) return this.error('auth.apiKey is required')
      if (!exchangeConfig.auth.secret) return this.error('auth.secret is required')
      if (!exchangeConfig.tradePollInterval) return this.error('tradePollInterval is required')

      ExchangeStore.instance.save(exchangeConfig)
      this.addExchange(exchangeConfig)
      wsServer.broadcast('add-exchange', { ...exchangeConfig })
    })

    wsServer.registerAction(`add-strategy`, (strategyConfig: StrategyConfig) => {
      const { exchange } = strategyConfig
      if (!this.checkForExchange(exchange)) return

      StrategyStore.instance.save(strategyConfig)
      this.exchangeCores.get(exchange).addStrategy(strategyConfig)
      wsServer.broadcast('add-strategy', { ...strategyConfig })
    })

    wsServer.registerAction(`get-balance`, async ({ exchange }) => {
      if (!this.checkForExchange(exchange)) return

      const balance = await this.exchangeCores.get(exchange).getBalances()
      wsServer.broadcast(`get-balance`, { exchange, balance })
    })

    wsServer.registerAction(`start-sync`, ({ exchange, symbol, days }) => {
      if (!this.checkForExchange(exchange)) return

      this.exchangeCores.get(exchange).startSync(symbol, days)
    })

    wsServer.registerAction(`stop-sync`, ({ exchange, symbol }) => {
      if (!this.checkForExchange(exchange)) return

      this.exchangeCores.get(exchange).stopSync(symbol)
    })

    wsServer.registerAction(`start-strategy`, ({ exchange, symbol, strategy }) => {
      if (!this.checkForExchange(exchange)) return

      this.exchangeCores.get(exchange).startStrategy(symbol, strategy)
    })

    wsServer.registerAction(`stop-strategy`, ({ exchange, symbol, strategy }) => {
      if (!this.checkForExchange(exchange)) return

      this.exchangeCores.get(exchange).stopStrategy(symbol, strategy)
    })

    wsServer.registerAction(`adjust-wallet`, ({ exchange, symbol, strategy, asset, currency }) => {
      if (!this.checkForExchange(exchange)) return

      this.exchangeCores.get(exchange).adjustWallet(symbol, strategy, asset, currency)
    })
  }

  private checkForExchange(exchange: string) {
    return this.exchangeCores.has(exchange) ? true : this.error(`exchange ${exchange} not configured`)
  }

  private error(error: string) {
    logger.error(error)
    wsServer.broadcast('error', { error: `Core Error: ${error}` })
    return false
  }
}

import { SessionStore, ExchangeStore } from '@store'
import { ExchangeProvider } from '@exchange'
import { ExchangeCore } from './exchange'
import { wsServer, ExchangeCollection, ExchangeConfig } from '@lib'

export class Core {
  private readonly exchangeProvider: ExchangeProvider
  private readonly exchangeCores: Map<string, ExchangeCore> = new Map()

  constructor() {
    this.exchangeProvider = new ExchangeProvider()

    // Registers a new action for the bot to execute
    wsServer.registerAction('exchange-add', (exchangeConfig: ExchangeConfig) => {
      this.addExchange(exchangeConfig)
    })
  }

  public async init() {
    await SessionStore.instance.loadSession()
    const exchanges = await ExchangeStore.instance.loadAll()

    exchanges.forEach((exchangeConfig) => this.addExchange(exchangeConfig))
  }

  private addExchange(exchangeConfig: ExchangeConfig) {
    const addSuccess = this.exchangeProvider.addExchange(exchangeConfig)

    if (!addSuccess) return

    const exchangeCore = new ExchangeCore(this.exchangeProvider, exchangeConfig)
    this.exchangeCores.set(exchangeConfig.exchange, exchangeCore)
  }
}

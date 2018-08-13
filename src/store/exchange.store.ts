import { dbDriver, wsServer, ExchangeCollection, ExchangeAuthentication, ExchangeConfig } from '@lib'
import { SessionStore } from './session.store'
import { ExchangeAuth } from '@m8bTypes'

const singleton = Symbol()

export class ExchangeStore {
  public static get instance(): ExchangeStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new ExchangeStore()
    return this[singleton]
  }

  private readonly sessionId = SessionStore.instance.sessionId

  private get store() {
    return dbDriver.exchange
  }

  private constructor() {
    wsServer.registerAction('exchange-save', (exchangeConfig: ExchangeConfig) => {
      this.save(exchangeConfig)
    })

    wsServer.registerAction('exchange-load', ({ exchange }) => {
      const exchangeAuth = this.load(exchange)
      wsServer.broadcast('exchange-load', { exchange, ...exchangeAuth })
    })
  }

  public async save({ exchange, ...exchangeConfig }: ExchangeConfig) {
    await this.store.update({ sessionId: this.sessionId, exchange }, { $set: { ...exchangeConfig } }, { upsert: true })
  }

  public load(exchange: string) {
    return this.store.findOne({ sessionId: this.sessionId, exchange })
  }

  public loadAll() {
    return this.store.find({ sessionId: this.sessionId }).toArray()
  }
}

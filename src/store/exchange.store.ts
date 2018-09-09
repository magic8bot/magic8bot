import { dbDriver, ExchangeConfig } from '@lib'
import { SessionStore } from './session.store'

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

  public async save(exchangeConfig: ExchangeConfig) {
    const { exchange, ...exchangeConf } = exchangeConfig
    await this.store.update({ sessionId: this.sessionId, exchange }, { $set: { ...exchangeConf } }, { upsert: true })
  }

  public load(exchange: string) {
    return this.store.findOne({ sessionId: this.sessionId, exchange }, { projection: { _id: 0, sessionId: 0, auth: 0 } })
  }

  public loadWithAuth(exchange: string) {
    return this.store.findOne({ sessionId: this.sessionId, exchange }, { projection: { _id: 0, sessionId: 0 } })
  }

  public loadAll() {
    return this.store.find({ sessionId: this.sessionId }, { projection: { _id: 0, sessionId: 0, auth: 0 } }).toArray()
  }

  public loadAllWithAuth() {
    return this.store.find({ sessionId: this.sessionId }, { projection: { _id: 0, sessionId: 0 } }).toArray()
  }

  public delete(exchange: string) {
    return this.store.deleteOne({ sessionId: this.sessionId, exchange })
  }
}

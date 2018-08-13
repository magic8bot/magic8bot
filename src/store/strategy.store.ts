import { dbDriver, wsServer } from '@lib'
import { SessionStore } from './session.store'
import { StoreOpts } from '@m8bTypes'

const singleton = Symbol()

type StrategyOpts = Record<string, string | number | boolean>

export class StrategyStore {
  public static get instance(): StrategyStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new StrategyStore()
    return this[singleton]
  }

  private readonly sessionId = SessionStore.instance.sessionId

  private get store() {
    return dbDriver.strategy
  }

  private constructor() {
    wsServer.registerAction('strategy-save', (payload: StrategyOpts & StoreOpts) => {
      const { exchange, symbol, strategy, ...strategyOpts } = payload
      this.save({ exchange, symbol, strategy }, strategyOpts)
    })

    wsServer.registerAction('strategy-load', (storeOpts: StoreOpts) => {
      const strategyOpts = this.load(storeOpts)
      wsServer.broadcast('strategy-load', strategyOpts)
    })
  }

  public async save(storeOpts: StoreOpts, strategyOpts: StrategyOpts) {
    await this.store.update({ sessionId: this.sessionId, ...storeOpts }, { $set: { ...strategyOpts } }, { upsert: true })
  }

  public async load(storeOpts: StoreOpts) {
    return this.store.findOne({ sessionId: this.sessionId, ...storeOpts })
  }

  public async loadAll() {
    return this.store.find({ sessionId: this.sessionId }).toArray()
  }
}

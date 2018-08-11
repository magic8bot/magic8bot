import { dbDriver, Wallet, eventBus, EVENT, Adjustment } from '@lib'
import { SessionStore } from './session.store'
import { StoreOpts } from '@m8bTypes'

const singleton = Symbol()

export class AdjustmentStore {
  public static get instance(): AdjustmentStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new AdjustmentStore()
    return this[singleton]
  }

  private sessionId: string = SessionStore.instance.sessionId

  private constructor() {}

  public async adjustWallet(storeOpts: StoreOpts, adjustment: Adjustment) {
    const timestamp = new Date().getTime()
    await dbDriver.adjustment.save({ sessionId: this.sessionId, ...storeOpts, timestamp, ...adjustment })
  }
}

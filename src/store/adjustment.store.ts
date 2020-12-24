import { AdjustmentModel, Adjustment } from '@magic8bot/db'

import { StoreOpts } from '@m8bTypes'

const singleton = Symbol()

export class AdjustmentStore {
  public static get instance(): AdjustmentStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new AdjustmentStore()
    return this[singleton]
  }

  private constructor() {}

  public async adjustWallet(storeOpts: StoreOpts, adjustment: Adjustment) {
    await AdjustmentModel.adjustWallet(storeOpts, adjustment)
  }
}

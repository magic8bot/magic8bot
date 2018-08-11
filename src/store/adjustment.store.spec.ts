const mockId = 'test'

import { AdjustmentStore } from './adjustment.store'

describe('AdjustmentStore', () => {
  const storeOpts = { exchange: mockId, symbol: mockId }
  let adjustmentStore: AdjustmentStore

  beforeAll(() => {
    adjustmentStore = AdjustmentStore.instance
  })

  test('saves an adjustment', async () => {
    await adjustmentStore.adjustWallet(storeOpts, { asset: 0, currency: 100, type: 'init' })
  })
})

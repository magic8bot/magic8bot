import { TradeStore } from './trade.store'

describe('TradeStore', () => {
  const storeOpts = { exchange: 'test', symbol: 'test' }
  let tradeStore: TradeStore

  beforeAll(() => {
    tradeStore = TradeStore.instance
  })

  it('should be able to add symbols', async (done) => {
    tradeStore.addSymbol(storeOpts)

    expect(tradeStore.tradesMap.size).toEqual(1)

    done()
  })
})

import { TradeStore } from './trade.store'

describe('TradeStore', () => {
  let tradeStore: TradeStore

  beforeEach(() => {
    tradeStore = TradeStore.instance
  })

  it('should be able to add symbols', async (done) => {
    tradeStore.addSymbol('test', 'test')

    expect(tradeStore.tradesMap.size).toEqual(1)

    done()
  })
})

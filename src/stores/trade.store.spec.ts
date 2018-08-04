import { TradeStore } from './trade.store'
import { now, makeNewOrder } from './spec.util'
import { time } from '@util'
import { Trade } from 'ccxt'

describe('TradeStore', () => {
  let tradeStore: TradeStore

  beforeEach(() => {
    tradeStore = new TradeStore()
  })

  it('should be able to add symbols', async (done) => {
    tradeStore.addSymbol('test', 'test')

    expect(tradeStore.tradesMap.size).toEqual(1)

    done()
  })
})

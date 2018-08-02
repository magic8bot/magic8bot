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

  it('should update a symbol with trades', async (done) => {
    tradeStore.addSymbol('test', 'test')
    const trades = [...Array(9).fill(0)].map((v, i) => makeNewOrder(time(now).sub.s(i * 10))).reverse()

    await tradeStore.insertTrades('test', 'test', trades as Trade[])

    expect(tradeStore.tradesMap.get('test.test').size).toEqual(9)

    done()
  })
})

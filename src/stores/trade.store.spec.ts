import { TradeStore } from './trade.store'
import { now, makeNewOrder } from './spec.util'
import { time } from '@util'

describe('TradeStore', () => {
  let tradeStore: TradeStore

  beforeEach(() => {
    tradeStore = new TradeStore()
  })

  it('should be able to add selectors', async (done) => {
    tradeStore.addSelector('test')

    expect(tradeStore.tradesMap.size).toEqual(1)

    done()
  })

  it('should update a selector with trades', async (done) => {
    tradeStore.addSelector('test')
    const trades = [...Array(9).fill(0)].map((v, i) => makeNewOrder(time(now).sub.s(i * 10))).reverse()

    await tradeStore.update('test', trades)

    expect(tradeStore.tradesMap.get('test').length).toEqual(9)

    done()
  })
})

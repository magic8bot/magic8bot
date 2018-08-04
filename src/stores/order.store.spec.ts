import { OrderStore } from './order.store'
import { OrderWithTrades } from '@lib'

const order: OrderWithTrades = {
  id: 'test',
  price: 5,
  amount: 5,
  timestamp: 5,
  type: 'market',
  status: 'open',
  side: 'buy',
  info: null,
  datetime: null,
  symbol: 'test',
  cost: 25,
  filled: 0,
  remaining: 5,
  fee: {
    cost: 0,
    currency: 'btc',
    rate: 0,
  },
}

describe('OrderStore', () => {
  let orderStore: OrderStore

  beforeEach(() => {
    orderStore = new OrderStore({ exchange: 'test', symbol: 'test', strategy: 'test' })
  })

  it('should save new orders', async (done) => {
    expect(async () => {
      await orderStore.newOrder(order)
      done()
    }).not.toThrowError()
  })
})

import { OrderStore } from './order.store'

// Keep TS happy.
const type: 'buy' | 'sell' = 'buy'

const orderItem = {
  cancel_after: '1m',
  execution_time: 4,
  fee: 5,
  mode: 'live',
  order_id: 'test',
  order_type: 5,
  price: 5,
  size: 5,
  time: 5,
  slippage: 5,
  type,
}

describe('OrderStore store', () => {
  let orderStore: OrderStore

  beforeEach(() => {
    orderStore = new OrderStore('test', 'test')
  })

  it('should save new orders', async (done) => {
    expect(async () => {
      await orderStore.newOrder(orderItem)
      done()
    }).not.toThrowError()
  })

  it('should not leak between tests', async (done) => {
    await orderStore.loadOrders()
    const orders = orderStore.orders

    expect(orders.length).toEqual(0)

    done()
  })

  // @todo(notVitaliy): Figure out why this test is flaky
  it('should load previous orders', async (done) => {
    await orderStore.newOrder(orderItem)
    await orderStore.loadOrders()
    const orders = orderStore.orders

    expect(orders.length).toEqual(1)

    done()
  })
})

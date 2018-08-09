import { OrderStore, ORDER_STATE } from './order.store'
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
    orderStore = new OrderStore()
    orderStore.addSymbol('test', 'test', 'test')
  })

  it('should save new orders', async (done) => {
    expect(async () => {
      await orderStore.newOrder('test', 'test', 'test', order)
      done()
    }).not.toThrowError()
  })

  it('should return open order', async (done) => {
    expect(async () => {
      await orderStore.newOrder('test', 'test', 'test', order)
      expect(orderStore.getOpenOrder('test', 'test', 'test', order.id).status).toEqual('open')
      done()
    }).not.toThrowError()
  })

  it('should return order pending state', async (done) => {
    expect(async () => {
      await orderStore.newOrder('test', 'test', 'test', order)
      expect(orderStore.getOrderState('test', 'test', 'test', order.id)).toEqual(ORDER_STATE.PENDING)
      done()
    }).not.toThrowError()
  })

  it('should test update order', async (done) => {
    expect(async () => {
      await orderStore.newOrder('test', 'test', 'test', order)
      order.status = 'closed'
      orderStore.updateOrder('test', 'test', 'test', order)
      expect(orderStore.getOrderState('test', 'test', 'test', order.id)).toEqual(ORDER_STATE.DONE)

      done()
    }).not.toThrowError()
  })

  it('should return all pending orders order', async (done) => {
    expect(async () => {
      await orderStore.newOrder('test', 'test', 'test', order)
      expect(orderStore.getAllPendingOrders('test', 'test', 'test')).toEqual(['test'])
      done()
    }).not.toThrowError()
  })

  it('should close the open order', async (done) => {
    expect(async () => {
      await orderStore.newOrder('test', 'test', 'test', order)
      orderStore.closeOpenOrder('test', 'test', 'test', order.id)
      expect(orderStore.getOpenOrder('test', 'test', 'test', order.id)).toBeUndefined()
      done()
    }).not.toThrowError()
  })
})

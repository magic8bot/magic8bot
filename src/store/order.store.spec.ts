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
  const storeOpts = { exchange: 'test', symbol: 'test', strategy: 'test' }
  let orderStore: OrderStore

  beforeAll(() => {
    orderStore = OrderStore.instance
    orderStore.addSymbol(storeOpts)
  })

  test('should save new orders', async () => {
    expect(async () => {
      await orderStore.newOrder(storeOpts, order)
    }).not.toThrowError()
  })

  test('should return open order', async () => {
    expect(async () => {
      await orderStore.newOrder(storeOpts, order)
      expect(orderStore.getOpenOrder(storeOpts, order.id).status).toEqual('open')
    }).not.toThrowError()
  })

  test('should return order pending state', async () => {
    expect(async () => {
      await orderStore.newOrder(storeOpts, order)
      expect(orderStore.getOrderState(storeOpts, order.id)).toEqual(ORDER_STATE.PENDING)
    }).not.toThrowError()
  })

  test('should test update order (open)', async () => {
    expect(async () => {
      await orderStore.newOrder(storeOpts, order)
      orderStore.updateOrder(storeOpts, { ...order, status: 'open' })
      expect(orderStore.getOrderState(storeOpts, order.id)).toEqual(ORDER_STATE.PENDING)
    }).not.toThrowError()
  })

  test('should test update order (canceled)', async () => {
    expect(async () => {
      await orderStore.newOrder(storeOpts, order)
      orderStore.updateOrder(storeOpts, { ...order, status: 'canceled' })
      expect(orderStore.getOrderState(storeOpts, order.id)).toEqual(ORDER_STATE.CANCELED)
    }).not.toThrowError()
  })

  test('should test update order (closed)', async () => {
    expect(async () => {
      await orderStore.newOrder(storeOpts, order)
      orderStore.updateOrder(storeOpts, { ...order, status: 'closed' })
      expect(orderStore.getOrderState(storeOpts, order.id)).toEqual(ORDER_STATE.DONE)
    }).not.toThrowError()
  })

  test('should return all pending orders order', async () => {
    expect(async () => {
      await orderStore.newOrder(storeOpts, order)
      expect(orderStore.getAllPendingOrders(storeOpts)).toEqual(['test'])
    }).not.toThrowError()
  })

  test('should close the open order', async () => {
    expect(async () => {
      await orderStore.newOrder(storeOpts, order)
      orderStore.closeOpenOrder(storeOpts, order.id)
      expect(orderStore.getOpenOrder(storeOpts, order.id)).toBeUndefined()
    }).not.toThrowError()
  })

  test('bullshit', async () => {
    const a = OrderStore.instance
    orderStore.saveOrder(null, { id: null, rest: null } as any)
  })
})

import { OrderStore, ORDER_STATE } from './order.store'
import { OrderWithTrades } from '@magic8bot/db'

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
  clientOrderId: '',
  lastTradeTimestamp: 0,
  trades: [],
  fee: {
    type: 'maker',
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
    await orderStore.newOrder(storeOpts, order)
  })

  test('should return open order', async () => {
    await orderStore.newOrder(storeOpts, order)
    expect(orderStore.getOpenOrder(storeOpts, order.id).status).toEqual('open')
  })

  test('should return order pending state', async () => {
    await orderStore.newOrder(storeOpts, order)
    expect(orderStore.getOrderState(storeOpts, order.id)).toEqual(ORDER_STATE.PENDING)
  })

  test('should test update order (open)', async () => {
    await orderStore.newOrder(storeOpts, order)
    orderStore.updateOrder(storeOpts, { ...order, status: 'open' })
    expect(orderStore.getOrderState(storeOpts, order.id)).toEqual(ORDER_STATE.PENDING)
  })

  test('should test update order (canceled)', async () => {
    await orderStore.newOrder(storeOpts, order)
    orderStore.updateOrder(storeOpts, { ...order, status: 'canceled' })
    expect(orderStore.getOrderState(storeOpts, order.id)).toEqual(ORDER_STATE.CANCELED)
  })

  test('should test update order (closed)', async () => {
    await orderStore.newOrder(storeOpts, order)
    orderStore.updateOrder(storeOpts, { ...order, status: 'closed' })
    expect(orderStore.getOrderState(storeOpts, order.id)).toEqual(ORDER_STATE.DONE)
  })

  test('should return all pending orders order', async () => {
    await orderStore.newOrder(storeOpts, order)
    expect(orderStore.getAllPendingOrders(storeOpts)).toEqual(['test'])
  })

  test('should close the open order', async () => {
    await orderStore.newOrder(storeOpts, order)
    orderStore.closeOpenOrder(storeOpts, order.id)
    expect(orderStore.getOpenOrder(storeOpts, order.id)).toBeUndefined()
  })
})

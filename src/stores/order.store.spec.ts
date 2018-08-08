import { OrderStore, ORDER_STATE } from './order.store'
import { OrderWithTrades } from '@lib'
import { dbDriver } from '../lib/db/db-driver.lib'

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

  it('should return open order', async (done) => {
    expect(async () => {
      await orderStore.newOrder(order)
      expect(orderStore.getOpenOrder(order.id).status).toEqual('open')
      done()
    }).not.toThrowError()
  })

  it('should return order pending state', async (done) => {
    expect(async () => {
      await orderStore.newOrder(order)
      expect(orderStore.getOrderState(order.id)).toEqual(ORDER_STATE.PENDING)
      done()
    }).not.toThrowError()
  })

  it('should test update order', async (done) => {
    expect(async () => {
      await orderStore.newOrder(order)
      order.status = 'closed'
      orderStore.updateOrder(order)
      expect(orderStore.getOrderState(order.id)).toEqual(ORDER_STATE.DONE)

      done()
    }).not.toThrowError()
  })

  it('should return all pending orders order', async (done) => {
    expect(async () => {
      await orderStore.newOrder(order)
      expect(orderStore.getAllPendingOrders()).toEqual(['test'])
      done()
    }).not.toThrowError()
  })

  it('should close the open order', async (done) => {
    expect(async () => {
      await orderStore.newOrder(order)
      orderStore.closeOpenOrder(order.id)
      expect(orderStore.getOpenOrder(order.id)).toBeUndefined()
      done()
    }).not.toThrowError()
  })

})

import { dbDriver, OrderWithTrades } from '@lib'
import { sessionStore } from './session.store'
import { Order } from 'ccxt'

interface Opts {
  exchange: string
  symbol: string
  strategy: string
}

export enum ORDER_STATE {
  PENDING = 'pending',
  PENDING_CANCEL = 'pending_cancel',
  CANCELED = 'canceled',
  DONE = 'done',
}

export class OrderStore {
  private openOrders: Map<string, OrderWithTrades> = new Map()
  private orderStates: Map<string, ORDER_STATE> = new Map()
  private readonly sessionId = sessionStore.sessionId
  private readonly exchange: string
  private readonly symbol: string
  private readonly strategy: string

  constructor(opts: Opts) {
    const { exchange, symbol, strategy } = opts
    this.exchange = exchange
    this.symbol = symbol
    this.strategy = strategy
  }

  public async newOrder(order: Order | OrderWithTrades) {
    this.openOrders.set(order.id, order as OrderWithTrades)
    this.orderStates.set(order.id, ORDER_STATE.PENDING)

    const { sessionId, exchange, symbol, strategy } = this

    await dbDriver.order.insertOne({ ...order, sessionId, exchange, symbol, strategy })
  }

  public getOpenOrder(id: string) {
    return this.openOrders.get(id)
  }

  public closeOpenOrder(id: string) {
    this.openOrders.delete(id)
  }

  public updateOrder(order: OrderWithTrades) {
    if (order.status !== 'open') this.updateOrderState(order.id, order.status === 'closed' ? ORDER_STATE.DONE : ORDER_STATE.CANCELED)

    this.openOrders.set(order.id, order)
  }

  public getAllPendingOrders() {
    return Array.from(this.orderStates.entries())
      .filter(([id, state]) => state === ORDER_STATE.PENDING)
      .map(([id]) => id)
  }

  public getOrderState(id: string) {
    return this.orderStates.get(id)
  }

  public updateOrderState(id: string, state: ORDER_STATE) {
    this.orderStates.set(id, state)
  }

  public async saveOrder(order: OrderWithTrades) {
    const { id, ...updatedOrder } = order
    return dbDriver.order.updateOne({ id }, { $set: { ...updatedOrder } })
  }
}

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
  private openOrders: Map<string, Map<string, OrderWithTrades>> = new Map()
  private orderStates: Map<string, Map<string, ORDER_STATE>> = new Map()
  private readonly sessionId = sessionStore.sessionId

  public addSymbol(exchange: string, symbol: string, strategy: string) {
    const idStr = this.makeIdStr(exchange, symbol, strategy)
    this.openOrders.set(idStr, new Map())
    this.orderStates.set(idStr, new Map())
  }

  public async newOrder(exchange: string, symbol: string, strategy: string, order: Order | OrderWithTrades) {
    const idStr = this.makeIdStr(exchange, symbol, strategy)
    this.openOrders.get(idStr).set(order.id, order as OrderWithTrades)
    this.orderStates.get(idStr).set(order.id, ORDER_STATE.PENDING)

    const { sessionId } = this

    await dbDriver.order.insertOne({ ...order, sessionId, exchange, symbol, strategy })
  }

  public getOpenOrder(exchange: string, symbol: string, strategy: string, id: string) {
    const idStr = this.makeIdStr(exchange, symbol, strategy)
    return this.openOrders.get(idStr).get(id)
  }

  public closeOpenOrder(exchange: string, symbol: string, strategy: string, id: string) {
    const idStr = this.makeIdStr(exchange, symbol, strategy)
    this.openOrders.get(idStr).delete(id)
  }

  public updateOrder(exchange: string, symbol: string, strategy: string, order: OrderWithTrades) {
    const idStr = this.makeIdStr(exchange, symbol, strategy)
    if (order.status !== 'open') this.updateOrderState(exchange, symbol, strategy, order.id, order.status === 'closed' ? ORDER_STATE.DONE : ORDER_STATE.CANCELED)

    this.openOrders.get(idStr).set(order.id, order)
  }

  public getAllPendingOrders(exchange: string, symbol: string, strategy: string) {
    const idStr = this.makeIdStr(exchange, symbol, strategy)

    return Array.from(this.orderStates.get(idStr).entries())
      .filter(([id, state]) => state === ORDER_STATE.PENDING)
      .map(([id]) => id)
  }

  public getOrderState(exchange: string, symbol: string, strategy: string, id: string) {
    const idStr = this.makeIdStr(exchange, symbol, strategy)
    return this.orderStates.get(idStr).get(id)
  }

  public updateOrderState(exchange: string, symbol: string, strategy: string, id: string, state: ORDER_STATE) {
    const idStr = this.makeIdStr(exchange, symbol, strategy)
    this.orderStates.get(idStr).set(id, state)
  }

  public async saveOrder(exchange: string, order: OrderWithTrades) {
    const { id, ...updatedOrder } = order
    return dbDriver.order.updateOne({ id, exchange }, { $set: { ...updatedOrder } })
  }

  private makeIdStr(exchange: string, symbol: string, strategy: string) {
    return `${exchange}.${symbol}.${strategy}`
  }
}

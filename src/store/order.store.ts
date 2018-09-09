import { dbDriver, OrderWithTrades, wsServer } from '@lib'
import { SessionStore } from './session.store'
import { Order } from 'ccxt'
import { StoreOpts } from '@m8bTypes'

const singleton = Symbol()

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
  public static get instance(): OrderStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new OrderStore()
    return this[singleton]
  }

  private openOrders: Map<string, Map<string, OrderWithTrades>> = new Map()
  private orderStates: Map<string, Map<string, ORDER_STATE>> = new Map()
  private readonly sessionId = SessionStore.instance.sessionId

  private constructor() {}

  public addSymbol(storeOpts: StoreOpts) {
    const idStr = this.makeIdStr(storeOpts)
    this.openOrders.set(idStr, new Map())
    this.orderStates.set(idStr, new Map())
  }

  public async newOrder({ exchange, symbol, strategy }: StoreOpts, order: Order | OrderWithTrades) {
    const idStr = this.makeIdStr({ exchange, symbol, strategy })
    this.openOrders.get(idStr).set(order.id, order as OrderWithTrades)
    this.orderStates.get(idStr).set(order.id, ORDER_STATE.PENDING)

    const { sessionId } = this

    const data = { ...order, sessionId, exchange, symbol, strategy }
    await dbDriver.order.insertOne(data)

    // @todo(notVitaliy): Find a better place for this
    wsServer.broadcast('order-new', data)
  }

  public getOpenOrder(storeOpts: StoreOpts, id: string) {
    const idStr = this.makeIdStr(storeOpts)
    return this.openOrders.get(idStr).get(id)
  }

  public closeOpenOrder(storeOpts: StoreOpts, id: string) {
    const idStr = this.makeIdStr(storeOpts)
    this.openOrders.get(idStr).delete(id)
  }

  public updateOrder(storeOpts: StoreOpts, order: OrderWithTrades) {
    const idStr = this.makeIdStr(storeOpts)
    if (order.status !== 'open') this.updateOrderState(storeOpts, order.id, order.status === 'closed' ? ORDER_STATE.DONE : ORDER_STATE.CANCELED)

    this.openOrders.get(idStr).set(order.id, order)
  }

  public getAllPendingOrders(storeOpts: StoreOpts) {
    const idStr = this.makeIdStr(storeOpts)

    return Array.from(this.orderStates.get(idStr).entries())
      .filter(([id, state]) => state === ORDER_STATE.PENDING)
      .map(([id]) => id)
  }

  public getOrderState(storeOpts: StoreOpts, id: string) {
    const idStr = this.makeIdStr(storeOpts)
    return this.orderStates.get(idStr).get(id)
  }

  public updateOrderState(storeOpts: StoreOpts, id: string, state: ORDER_STATE) {
    const idStr = this.makeIdStr(storeOpts)
    this.orderStates.get(idStr).set(id, state)
  }

  /* istanbul ignore next */
  public async saveOrder(storeOpts: StoreOpts, order: OrderWithTrades) {
    const { exchange } = storeOpts
    const { id, ...updatedOrder } = order
    await dbDriver.order.updateOne({ id, exchange }, { $set: { ...updatedOrder } })

    // @todo(notVitaliy): Find a better place for this
    wsServer.broadcast('order-update', { ...order, ...storeOpts })
  }

  private makeIdStr({ exchange, symbol, strategy }: StoreOpts) {
    return `${exchange}.${symbol}.${strategy}`
  }
}

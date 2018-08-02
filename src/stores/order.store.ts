import { dbDriver, OrderWithTrades } from '@lib'
import { sessionStore } from './session.store'
import { Order } from 'ccxt'

interface Opts {
  exchange: string
  symbol: string
  strategy: string
}

export class OrderStore {
  private openOrders: Map<string, OrderWithTrades> = new Map()
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
    this.openOrders.set(order.id, order)
  }

  public async saveOrder(order: OrderWithTrades) {
    const { id, ...updatedOrder } = order
    return dbDriver.order.updateOne({ id }, updatedOrder)
  }
}

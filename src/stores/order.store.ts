import { dbDriver, OrderItem } from '@lib'
import { sessionStore } from './session.store'

interface Opts {
  exchange: string
  symbol: string
  strategy: string
}

export class OrderStore {
  public orders: OrderItem[] = []
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

  public async newOrder(order: OrderItem) {
    this.orders.push(order)

    const { sessionId, exchange, symbol, strategy } = this

    await dbDriver.order.save({ ...order, sessionId, exchange, symbol, strategy })
  }

  public async loadOrders() {
    const { sessionId, exchange, symbol, strategy } = this

    this.orders = await dbDriver.order
      .find({ sessionId, exchange, symbol, strategy })
      .sort({ time: -1 })
      .toArray()
  }
}

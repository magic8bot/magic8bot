import { dbDriver, OrderItem } from '@lib'
import { sessionStore } from './session.store'

export class OrderStore {
  public orders: OrderItem[] = []
  private readonly sessionId = sessionStore.sessionId

  constructor(private readonly symbol: string) {}

  public async newOrder(order: OrderItem) {
    this.orders.push(order)

    await dbDriver.order.save({
      ...order,
      symbol: this.symbol,
      sessionId: this.sessionId,
    })
  }

  public async loadOrders() {
    const { sessionId, symbol } = this
    this.orders = await dbDriver.order
      .find({ sessionId, symbol })
      .sort({ time: -1 })
      .toArray()
  }
}

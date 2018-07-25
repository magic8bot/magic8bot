import { dbDriver, OrderItem } from '@lib'
import { sessionStore } from './session.store'

export class OrderStore {
  public orders: OrderItem[] = []
  private readonly sessionId = sessionStore.sessionId

  constructor(private readonly selector: string) {}

  public async newOrder(order: OrderItem) {
    this.orders.push(order)

    await dbDriver.order.save({
      ...order,
      selector: this.selector,
      sessionId: this.sessionId,
    })
  }

  public async loadOrders() {
    const { sessionId, selector } = this
    this.orders = await dbDriver.order
      .find({ sessionId, selector })
      .sort({ time: -1 })
      .toArray()
  }
}

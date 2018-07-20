import { dbDriver, OrderItem } from '@lib'

export class OrderStore {
  public orders: OrderItem[] = []

  constructor(private readonly sessionId: string, private readonly selector: string) {}

  async newOrder(order: OrderItem) {
    this.orders.push(order)

    await dbDriver.order.save({
      ...order,
      sessionId: this.sessionId,
      selector: this.selector,
    })
  }

  async loadOrders() {
    const { sessionId, selector } = this
    this.orders = await dbDriver.order
      .find({ sessionId, selector })
      .sort({ time: -1 })
      .toArray()
  }
}

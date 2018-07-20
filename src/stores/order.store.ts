import { dbDriver, OrderItem } from '@lib'

export class OrderStore {
  public orders: OrderItem[] = []

  constructor(private readonly sessionId: string, private readonly selector: string) {}

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

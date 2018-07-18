import { Collection } from 'mongodb'
import { observable, action, transaction } from 'mobx'

import { mongoService } from '../services/mongo.service'

interface OrderItem {
  cancel_after: string
  execution_time: number
  fee: number
  mode: string
  order_id: string
  order_type: number
  price: number
  size: number
  time: number
  slippage: number
  type: 'buy' | 'sell'
}

type OrderCollection = OrderItem & {
  sessionId: string
  selector: string
}

export class OrderStore {
  @observable public orders: OrderItem[] = []

  private collection: Collection<OrderCollection> = mongoService.connection.collection('beta_orders')

  constructor(private readonly sessionId: string, private readonly selector: string) {
    this.collection.createIndex({ selector: 1 })
    this.collection.createIndex({ sessionId: 1 })
    this.collection.createIndex({ time: 1 })
  }

  @action
  async newOrder(order: OrderItem) {
    await transaction(async () => {
      this.orders.push(order)

      await this.collection.save({
        ...order,
        sessionId: this.sessionId,
        selector: this.selector,
      })
    })
  }

  @action
  async loadOrders() {
    await transaction(async () => {
      const { sessionId, selector } = this
      this.orders = await this.collection
        .find({ sessionId, selector })
        .sort({ time: -1 })
        .toArray()
    })
  }
}

import { Collection } from 'mongodb'
import { mongoService } from '../services/mongo.service'

import { sleep } from '../util'

export interface TradeItem {
  trade_id: number
  time: number
  size: number
  price: number
  side: 'buy' | 'sell'
}

type TradeCollection = TradeItem & {
  selector: string
}

export class TradeStore {
  public tradesMap: Map<string, TradeItem[]> = new Map()
  private collection: Collection<TradeCollection> = mongoService.connection.collection('beta_trades')

  constructor() {
    this.collection.createIndex({ selector: 1 })
    this.collection.createIndex({ time: 1 })
  }

  addSelector(selector: string) {
    if (this.tradesMap.has(selector)) return

    this.tradesMap.set(selector, [])
  }

  async loadTrades(selector: string) {
    const trades = await this.collection
      .find({ selector })
      .sort({ time: 1 })
      .toArray()

    this.tradesMap.set(selector, trades)
  }

  async update(selector: string, newTrades: TradeItem[]) {
    await this.collection.insertMany(newTrades)

    const trades = !this.tradesMap.has(selector) ? [] : this.tradesMap.get(selector)
    newTrades.forEach((trade) => trades.push(trade))
    this.tradesMap.set(selector, trades)
  }
}

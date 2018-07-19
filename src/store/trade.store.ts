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
    this.collection.createIndex({ selector: 1, time: 1 })
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
    newTrades.forEach((value) => value['selector'] = selector)
    await this.collection.insertMany(newTrades)

    if (!this.tradesMap.has(selector)) this.tradesMap.set(selector, [])
    const trades = this.tradesMap.get(selector)
    newTrades.forEach((trade) => trades.push(trade))
  }
}

import { Collection } from 'mongodb'
import { observable, action, transaction } from 'mobx'

import { mongoService } from '../services/mongo.service'
import { TradesService } from '../services/trades.service'

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
  @observable public trades: TradeItem[] = []

  private collection: Collection<TradeCollection> = mongoService.connection.collection('beta_trades')

  constructor(private readonly selector: string, private readonly tradesService: TradesService) {
    this.collection.createIndex({ selector: 1 })
    this.collection.createIndex({ time: 1 })
  }

  @action
  async loadTrades() {
    await transaction(async () => {
      const { selector } = this
      this.trades = await this.collection
        .find({ selector })
        .sort({ time: 1 })
        .toArray()
    })
  }

  @action
  update(trades: TradeItem[]) {
    transaction(() => trades.forEach((trade) => this.trades.push(trade)))
  }
}

import { EventEmitter } from 'events'
import { terminal } from 'terminal-kit'

import { Collection } from 'mongodb'
import { observable, action, transaction } from 'mobx'

import { mongoService } from '../services/mongo.service'
import { TradesService } from '../services/trades.service'
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
  @observable public trades: TradeItem[] = []

  private collection: Collection<TradeCollection> = mongoService.connection.collection('beta_trades')

  constructor(
    private readonly selector: string,
    private readonly tradesService: TradesService,
    private readonly tradeEvents: EventEmitter
  ) {
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

  async getTrades() {
    // console.log(`getting trades: ${this.selector}`)
    // const trades = (await this.tradesService.getTrades()).map((trade) => {
    //   trade.selector = this.selector
    //   return trade
    // })
    // console.log(`got trades: ${this.selector}`)
    // this.collection.insertMany(trades)
    // console.log(`saved trades: ${this.selector}`)
  }

  async backfill(days: number) {
    const { tradesService } = this
    tradesService.markerStore.newMarker()
    const historyScan = tradesService.getHistoryScan()

    const now = new Date().getTime()
    const targetTime = now - 86400000 * days

    const baseTime = now - targetTime

    // console.log(`\n${this.selector} start`)
    this.tradeEvents.emit('start')
    while (true) {
      const trades = await tradesService.backfill(days)

      const oldestTrade = Math.min(...trades.map(({ time }) => time))
      const percent = (baseTime - (oldestTrade - targetTime)) / baseTime
      this.tradeEvents.emit('update', percent)

      if (historyScan === 'backward' && oldestTrade < targetTime) {
        this.tradeEvents.emit('done')
        // console.log(`\n\n${this.selector} done\n`)
        return
      }

      await this.collection.insertMany(trades)
      if (tradesService.getBackfillRateLimit()) await sleep(tradesService.getBackfillRateLimit())
    }
  }
}

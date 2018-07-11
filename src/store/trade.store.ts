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
    const {
      tradesService,
      tradesService: { markerStore },
    } = this
    const historyScan = tradesService.getHistoryScan()
    const markers = await markerStore.loadMarkers()

    if (historyScan === 'backward') {
      markers.sort(({ to: a }, { to: b }) => (a === b ? 0 : a > b ? -1 : 1))
    } else {
      markers.sort(({ from: a }, { from: b }) => (a === b ? 0 : a < b ? -1 : 1))
    }

    markerStore.marker = markers.length ? markers[0] : markerStore.makeMarker()

    while (true) {
      const trades = await tradesService.backfill(days)
      if (!trades.length) return

      console.log(trades.length)
      console.log(markerStore.marker)

      this.collection.insertMany(trades.map((trade) => ((trade.selector = this.selector), trade)))
      if (tradesService.getBackfillRateLimit()) {
        await sleep(tradesService.getBackfillRateLimit())
      }
    }
  }
}

import { MarkerStore, Marker } from '../store/marker.store'
import { Exchange } from '../engine/exchange'
import { Selector } from '../util'

interface TradesOptions {
  selector: Selector
  startTime: number
  sort?: { [key: string]: 1 | -1 }
  limit?: number
}

interface TradeOpts {
  product_id: string
  to: number
  from: number
}

export class TradesService {
  private tradeCursor: number = null

  public markerStore: MarkerStore

  constructor(private exchange: Exchange, private opts: TradesOptions) {
    this.markerStore = new MarkerStore(this.opts.selector.normalized)
    this.markerStore.newMarker()

    if (!this.opts.sort) this.opts.sort = { time: 1 }
    if (!this.opts.limit) this.opts.limit = 1000
  }

  async getTrades(opts: Partial<TradeOpts>) {
    opts.product_id = this.opts.selector.product_id
    if (!opts.from) opts.from = this.tradeCursor

    return await this.exchange.getTrades(opts as TradeOpts)

    // trades.forEach((trade) => {
    //   const tradeCursor = this.exchange.getCursor(trade)
    //   this.tradeCursor = Math.max(tradeCursor, this.tradeCursor)
    //   this.markerStore.updateMarker(trade, this.tradeCursor)
    // })

    // this.markerStore.saveMarker()

    // return trades
  }

  async backfill(days: number) {
    const { historyScan } = this.exchange
    if (historyScan === 'backward') {
      return await this.scanBack(days)
    }
  }

  private async scanBack(days: number) {
    const { marker } = this.markerStore
    const { to } = marker

    const trades = await this.getTrades({ to })

    trades.sort(({ time: a }, { time: b }) => (a === b ? 0 : a > b ? -1 : 1))
    trades.forEach((trade) => {
      const cursor = this.exchange.getCursor(trade)
      if (!marker.to) {
        marker.to = cursor
        marker.oldest_time = trade.time
        marker.newest_time = trade.time
      }

      marker.from = marker.from ? Math.min(marker.from, cursor) : cursor
      marker.oldest_time = Math.min(marker.oldest_time, trade.time)
    })

    const { _id } = this.markerStore.makeMarker()
    marker._id = _id
    this.markerStore.saveMarker()

    return trades
  }

  getTradeCursor() {
    return this.tradeCursor
  }

  getHistoryScan() {
    return this.exchange.historyScan
  }

  getBackfillRateLimit() {
    return this.exchange.backfillRateLimit
  }
}

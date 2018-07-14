import { MarkerStore, Marker } from '../store/marker.store'
import { Exchange } from '../engine/exchange'
import { Selector, sleep } from '../util'
import { window } from '../output'

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

    const trades = await this.exchange.getTrades(opts as TradeOpts)
    return trades.map((trade) => ((trade.selector = this.opts.selector.normalized), trade))
  }

  async backfill(start?: number) {
    const { historyScan } = this.exchange
    if (historyScan === 'backward') {
      return await this.scanBack()
    } else {
      return await this.scanForward(start)
    }
  }

  private async scanBack() {
    const to = await this.getNextBackMarker()

    const trades = await this.getTrades({ to })

    trades.sort((a, b) => {
      const aC = this.exchange.getCursor(a)
      const bC = this.exchange.getCursor(b)
      return aC === bC ? 0 : aC > bC ? -1 : 1
    })

    this.markerStore.marker = this.markerStore.makeMarker()
    const { marker } = this.markerStore
    trades.forEach((trade) => {
      const cursor = this.exchange.getCursor(trade)
      marker.from = marker.from ? Math.min(marker.from, cursor) : cursor
      marker.to = marker.to ? Math.max(marker.to, cursor) : cursor
      marker.newest_time = marker.newest_time ? Math.max(marker.newest_time, trade.time) : trade.time
      marker.oldest_time = marker.oldest_time ? Math.min(marker.oldest_time, trade.time) : trade.time
    })

    this.markerStore.saveMarker()

    return trades
  }

  async getNextBackMarker() {
    const { from } = this.markerStore.marker
    if (!from) return from

    const nextMarker = await this.markerStore.findInRange(this.opts.selector.normalized, from - 1)
    if (!nextMarker) return from

    this.markerStore.marker = nextMarker
    return await this.getNextBackMarker()
  }

  private async scanForward(newestTime: number) {
    const from = await this.getNextForwardMarker(newestTime)

    const trades = await this.getTrades({ from })

    trades.sort((a, b) => {
      const aC = this.exchange.getCursor(a)
      const bC = this.exchange.getCursor(b)
      return aC === bC ? 0 : aC < bC ? -1 : 1
    })

    if (!trades.length) return trades

    this.markerStore.marker = this.markerStore.makeMarker()
    const { marker } = this.markerStore
    trades.forEach((trade) => {
      const cursor = this.exchange.getCursor(trade)
      marker.from = marker.from ? Math.min(marker.from, cursor) : cursor
      marker.to = marker.to ? Math.max(marker.to, cursor) : cursor
      marker.newest_time = marker.newest_time ? Math.max(marker.newest_time, trade.time) : trade.time
      marker.oldest_time = marker.oldest_time ? Math.min(marker.oldest_time, trade.time) : trade.time
    })

    this.markerStore.saveMarker()

    return trades
  }

  private async getNextForwardMarker(newestTime: number) {
    const nextMarker = await this.markerStore.findInRange(this.opts.selector.normalized, newestTime)
    if (nextMarker) return nextMarker.to + 1

    return newestTime
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

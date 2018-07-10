import { MarkerService, Marker } from './marker.service'
import { Exchange } from '../engine/exchange'
import { Trade } from '@zbTypes'
import { Selector } from '../util'

interface TradesOptions {
  selector: Selector
  startTime: number
  sort?: { [key: string]: 1 | -1 }
  limit?: number
}

export class TradesService {
  private tradeCursor: number = null

  private markerService: MarkerService
  private marker: Marker

  constructor(private exchange: Exchange, private opts: TradesOptions) {
    this.markerService = new MarkerService(this.opts.selector.normalized)
    this.marker = this.markerService.newMarker()

    if (!this.opts.sort) this.opts.sort = { time: 1 }
    if (!this.opts.limit) this.opts.limit = 1000
  }

  async getTrades() {
    const opts = {
      product_id: this.opts.selector.product_id,
      from: this.tradeCursor,
    }

    const trades = (await this.exchange.getTrades(opts)).sort(
      ({ time: a }, { time: b }) => (a === b ? 0 : a > b ? -1 : 1)
    )

    trades.forEach((trade) => {
      const tradeCursor = this.exchange.getCursor(trade)
      this.tradeCursor = Math.max(tradeCursor, this.tradeCursor)
      this.updateMarker(trade)
    })

    this.markerService.saveMarker(this.marker)

    return trades
  }

  async updateMarker(trade: Trade) {
    if (!this.marker.from) {
      this.marker.from = this.tradeCursor
      this.marker.oldest_time = trade.time
      this.marker.newest_time = trade.time
    }

    this.marker.to = this.marker.to ? Math.max(this.marker.to, this.tradeCursor) : this.tradeCursor
    this.marker.newest_time = Math.max(this.marker.newest_time, trade.time)
  }

  getTradeCursor() {
    return this.tradeCursor
  }
}

import { MarkerStore, Marker } from '../store/marker.store'
import { Exchange } from '../engine/exchange'
import { Selector } from '../util'

interface TradesOptions {
  selector: Selector
  startTime: number
  sort?: { [key: string]: 1 | -1 }
  limit?: number
}

export class TradesService {
  private tradeCursor: number = null

  private markerStore: MarkerStore

  constructor(private exchange: Exchange, private opts: TradesOptions) {
    this.markerStore = new MarkerStore(this.opts.selector.normalized)
    this.markerStore.newMarker()

    if (!this.opts.sort) this.opts.sort = { time: 1 }
    if (!this.opts.limit) this.opts.limit = 1000
  }

  async getTrades(from?: number) {
    const opts = {
      product_id: this.opts.selector.product_id,
      from: from ? from : this.tradeCursor,
    }

    const trades = (await this.exchange.getTrades(opts)).sort(
      ({ time: a }, { time: b }) => (a === b ? 0 : a < b ? -1 : 1)
    )

    trades.forEach((trade) => {
      const tradeCursor = this.exchange.getCursor(trade)
      this.tradeCursor = Math.max(tradeCursor, this.tradeCursor)
      this.markerStore.updateMarker(trade, this.tradeCursor)
    })

    this.markerStore.saveMarker()

    return trades
  }

  getTradeCursor() {
    return this.tradeCursor
  }
}

import { MarkerStore } from '@stores'
import { ExchangeService } from './exchange.service'

interface TradeOpts {
  product_id: string
  to?: number
  from?: number
}

export class TradeService {
  private markerStore: MarkerStore
  private selectorMap: Map<string, string> = new Map()

  constructor(private readonly exchange: ExchangeService) {
    this.markerStore = new MarkerStore()
  }

  async getTrades(opts: TradeOpts) {
    return await this.exchange.getTrades(opts)
  }

  addSelector(selector: string, productId: string) {
    if (this.selectorMap.has(selector)) return

    this.markerStore.newMarker(selector)
    this.selectorMap.set(selector, productId)
  }

  async backfill(selector: string, start?: number) {
    const { historyScan } = this.exchange
    if (historyScan === 'backward') {
      return await this.scanBack(selector)
    } else {
      return await this.scanForward(selector, start)
    }
  }

  private async scanBack(selector: string) {
    const to = await this.getNextBackMarker(selector)
    const product_id = this.selectorMap.get(selector)
    const trades = await this.getTrades({ to, product_id })

    trades.sort((a, b) => {
      const aC = this.exchange.getCursor(a)
      const bC = this.exchange.getCursor(b)
      return aC === bC ? 0 : aC > bC ? -1 : 1
    })

    const marker = this.markerStore.newMarker(selector)

    trades.forEach((trade) => {
      const cursor = this.exchange.getCursor(trade)
      marker.from = marker.from ? Math.min(marker.from, cursor) : cursor
      marker.to = marker.to ? Math.max(marker.to, cursor) : cursor
      marker.newest_time = marker.newest_time ? Math.max(marker.newest_time, trade.time) : trade.time
      marker.oldest_time = marker.oldest_time ? Math.min(marker.oldest_time, trade.time) : trade.time
    })

    this.markerStore.saveMarker(selector)

    return trades
  }

  async getNextBackMarker(selector: string) {
    const { from } = this.markerStore.getMarker(selector)
    if (!from) return from

    const nextMarker = await this.markerStore.findInRange(selector, from - 1)
    if (!nextMarker) return from

    this.markerStore.setMarker(selector, nextMarker)
    return await this.getNextBackMarker(selector)
  }

  private async scanForward(selector: string, newestTime: number) {
    const from = await this.getNextForwardMarker(selector, newestTime)
    const product_id = this.selectorMap.get(selector)

    const trades = await this.getTrades({ from, product_id })

    trades.sort((a, b) => {
      const aC = this.exchange.getCursor(a)
      const bC = this.exchange.getCursor(b)
      return aC === bC ? 0 : aC < bC ? -1 : 1
    })

    if (!trades.length) return trades

    const marker = this.markerStore.newMarker(selector)

    marker.from = from
    trades.forEach((trade) => {
      const cursor = this.exchange.getCursor(trade)
      marker.to = marker.to ? Math.max(marker.to, cursor) : cursor
      marker.newest_time = marker.newest_time ? Math.max(marker.newest_time, trade.time) : trade.time
      marker.oldest_time = marker.oldest_time ? Math.min(marker.oldest_time, trade.time) : trade.time
    })

    this.markerStore.saveMarker(selector)

    return trades
  }

  private async getNextForwardMarker(selector: string, newestTime: number) {
    const nextMarker = await this.markerStore.findInRange(selector, newestTime)
    if (nextMarker) return await this.getNextForwardMarker(selector, nextMarker.to + 1)

    return newestTime
  }

  getHistoryScan() {
    return this.exchange.historyScan
  }

  getBackfillRateLimit() {
    return this.exchange.backfillRateLimit
  }
}

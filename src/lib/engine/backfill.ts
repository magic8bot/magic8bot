import { ExchangeProvider } from '@exchange'
import { TradeStore, MarkerStore } from '@stores'
import { TradeItem } from '../db'

export class Backfiller {
  private markerStore: MarkerStore

  constructor(
    private readonly exchange: string,
    private readonly exchangeProvider: ExchangeProvider,
    private readonly tradeStore: TradeStore
  ) {
    // should be init in engine
    this.markerStore = new MarkerStore()
  }

  public backfill(selector: string, days: number) {
    const now = new Date().getTime()
    const target = now - 86400000 * days

    const scan = this.exchangeProvider.getScan(this.exchange)
    return scan === 'back' ? this.scanBack(selector, target) : this.scanForward(selector, target)
  }

  private async scanBack(selector: string, end: number) {
    // The next "to" is the previous "from"
    const to = await this.getBackMarker(selector)

    const trades = await this.exchangeProvider.getTrades(this.exchange, selector, to)

    const from = Math.min(...trades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const { oldest_time } = await this.saveMarker(selector, to, from, trades)

    if (oldest_time > end) {
      await this.scanBack(selector, end)
    }
  }

  private async getBackMarker(selector: string) {
    const marker = this.markerStore.getMarker(selector)
    if (!marker || !marker.from) return null

    const nextMarker = await this.markerStore.findInRange(selector, marker.from - 1)
    if (!nextMarker) return marker.from

    this.markerStore.setMarker(selector, nextMarker)
    return this.getBackMarker(selector)
  }

  private async scanForward(selector: string, start: number) {
    const from = await this.getForwardMarker(selector, start)

    const trades = await this.exchangeProvider.getTrades(this.exchange, selector, from)

    if (!trades.length) return

    await this.tradeStore.update(this.exchange, selector, trades)

    const to = Math.max(...trades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const { newest_time } = await this.saveMarker(selector, to, from, trades)

    // Always get current time so backfill can catch up to "now"
    if (newest_time < new Date().getTime()) {
      return this.scanForward(selector, to)
    }
  }

  private async getForwardMarker(selector: string, target: number) {
    const marker = await this.markerStore.findInRange(selector, target)
    if (marker) return this.getForwardMarker(selector, marker.to + 1)
    return target
  }

  private async saveMarker(selector: string, to: number, from: number, trades: TradeItem[]) {
    const marker = this.markerStore.newMarker(selector)
    marker.to = to
    marker.from = from
    marker.newest_time = Math.max(...trades.map(({ time }) => time))
    marker.oldest_time = Math.min(...trades.map(({ time }) => time))

    await this.markerStore.saveMarker(selector)

    return marker
  }
}

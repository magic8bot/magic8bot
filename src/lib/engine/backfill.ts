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
    const to = await this.markerStore.getNextBackMarker(this.exchange, selector)

    const trades = await this.exchangeProvider.getTrades(this.exchange, selector, to)

    const from = Math.min(...trades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const { oldestTime } = await this.markerStore.saveMarker(this.exchange, selector, to, from, trades)

    if (oldestTime > end) {
      await this.scanBack(selector, end)
    }
  }

  private async scanForward(selector: string, start: number) {
    const from = await this.markerStore.getNextForwardMarker(this.exchange, selector, start)

    const trades = await this.exchangeProvider.getTrades(this.exchange, selector, from)

    if (!trades.length) return

    await this.tradeStore.update(this.exchange, selector, trades)

    const to = Math.max(...trades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const { newestTime } = await this.markerStore.saveMarker(this.exchange, selector, to, from, trades)

    // Always get current time so backfill can catch up to "now"
    if (newestTime < new Date().getTime()) {
      return this.scanForward(selector, to)
    }
  }
}

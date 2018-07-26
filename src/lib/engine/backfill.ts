import { ExchangeProvider } from '@exchange'
import { TradeStore, MarkerStore } from '@stores'
import { TradeItem } from '../db'

export class Backfiller {
  constructor(
    private readonly exchange: string,
    private readonly exchangeProvider: ExchangeProvider,
    private readonly tradeStore: TradeStore,
    private readonly markerStore: MarkerStore
  ) {}

  public backfill(symbol: string, days: number) {
    const now = new Date().getTime()
    const target = now - 86400000 * days

    const scan = this.exchangeProvider.getScan(this.exchange)
    return scan === 'back' ? this.scanBack(symbol, target) : this.scanForward(symbol, target)
  }

  private async scanBack(symbol: string, end: number) {
    // The next "to" is the previous "from"
    const to = await this.markerStore.getNextBackMarker(this.exchange, symbol)

    const trades = await this.exchangeProvider.getTrades(this.exchange, symbol, to)

    const from = Math.min(...trades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const { oldestTime } = await this.markerStore.saveMarker(this.exchange, symbol, to, from, trades)

    if (oldestTime > end) {
      await this.scanBack(symbol, end)
    }
  }

  private async scanForward(symbol: string, start: number) {
    const from = await this.markerStore.getNextForwardMarker(this.exchange, symbol, start)

    const trades = await this.exchangeProvider.getTrades(this.exchange, symbol, from)

    if (!trades.length) return

    await this.tradeStore.update(this.exchange, symbol, trades)

    const to = Math.max(...trades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const { newestTime } = await this.markerStore.saveMarker(this.exchange, symbol, to, from, trades)

    // Always get current time so backfill can catch up to "now"
    if (newestTime < new Date().getTime()) {
      return this.scanForward(symbol, to)
    }
  }
}

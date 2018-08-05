import { ExchangeProvider } from '@exchange'
import { TradeStore, MarkerStore } from '@stores'
import { sleep } from '@util'

export class TradeEngine {
  private readonly scanType: 'back' | 'forward'

  constructor(
    private readonly exchange: string,
    private readonly exchangeProvider: ExchangeProvider,
    private readonly tradeStore: TradeStore,
    private readonly markerStore: MarkerStore,
    private readonly tradePollInterval: number
  ) {
    this.scanType = this.exchangeProvider.getScan(this.exchange)
  }

  public async scan(symbol: string, days: number) {
    const now = new Date().getTime()
    const target = now - 86400000 * days

    await (this.scanType === 'back' ? this.scanBack(symbol, target) : this.scanForward(symbol, target))
    await this.tradeStore.loadTrades(this.exchange, symbol)
  }

  public async tick(symbol: string) {
    const target = (await this.markerStore.findLatestTradeMarker(this.exchange, symbol)).newestTime

    await (this.scanType === 'back' ? this.tickBack(symbol, target) : this.scanForward(symbol, target))
    await sleep(this.tradePollInterval)
    await this.tradeStore.loadTrades(this.exchange, symbol)
    await this.tick(symbol)
  }

  private async scanBack(symbol: string, end: number) {
    // The next "to" is the previous "from"
    const to = await this.markerStore.getNextBackMarker(this.exchange, symbol)

    const trades = await this.exchangeProvider.getTrades(this.exchange, symbol, to)

    await this.tradeStore.insertTrades(this.exchange, symbol, trades)

    const from = Math.min(...trades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const { oldestTime } = await this.markerStore.saveMarker(this.exchange, symbol, to, from, trades)

    console.log(`${this.exchange}.${symbol} scanBack`, { now: new Date(oldestTime), end: new Date(end) })

    if (oldestTime > end) {
      await this.scanBack(symbol, end)
    }
  }

  private async scanForward(symbol: string, start: number) {
    const from = await this.markerStore.getNextForwardMarker(this.exchange, symbol, start)

    const trades = await this.exchangeProvider.getTrades(this.exchange, symbol, from)

    if (!trades.length) return

    await this.tradeStore.insertTrades(this.exchange, symbol, trades)

    const to = Math.max(...trades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const { newestTime } = await this.markerStore.saveMarker(this.exchange, symbol, to, from, trades)

    console.log(`${this.exchange}.${symbol} scanForward`, { now: new Date(newestTime), end: new Date() })

    // Always get current time so backfill can catch up to "now"
    if (newestTime < new Date().getTime()) {
      await this.scanForward(symbol, to)
    }
  }

  private async tickBack(symbol: string, target: number, lastFrom: number = null) {
    const trades = await this.exchangeProvider.getTrades(this.exchange, symbol, lastFrom)

    const filteredTrades = trades.filter(({ timestamp }) => timestamp > target)

    // console.log(`${this.exchange}.${symbol} Got ${filteredTrades.length} new trade of ${trades.length} fetched.`)

    if (!filteredTrades.length) return

    await this.tradeStore.insertTrades(this.exchange, symbol, filteredTrades)

    const from = Math.min(...filteredTrades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const to = Math.max(...filteredTrades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    await this.markerStore.saveMarker(this.exchange, symbol, to, from, filteredTrades)

    if (filteredTrades.length === trades.length) await this.tickBack(symbol, target, from)
  }
}

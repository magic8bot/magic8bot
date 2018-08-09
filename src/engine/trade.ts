import { ExchangeProvider } from '@exchange'
import { TradeStore, MarkerStore } from '@stores'
import { sleep, logger } from '@util'

export class TradeEngine {
  private readonly scanType: 'back' | 'forward'

  private readonly tradeStore = TradeStore.instance
  private readonly markerStore = MarkerStore.instance

  constructor(private readonly exchange: string, private readonly exchangeProvider: ExchangeProvider, private readonly tradePollInterval: number) {
    this.scanType = this.exchangeProvider.getScan(this.exchange)
  }

  public async scan(symbol: string, days: number) {
    const storeOpts = { exchange: this.exchange, symbol }

    const now = this.getNow()
    const target = now - 86400000 * days

    await (this.scanType === 'back' ? this.scanBack(symbol, target) : this.scanForward(symbol, target))
    await this.tradeStore.loadTrades(storeOpts)
  }

  public async tick(symbol: string) {
    const storeOpts = { exchange: this.exchange, symbol }
    const target = (await this.markerStore.findLatestTradeMarker(storeOpts)).newestTime

    await (this.scanType === 'back' ? this.tickBack(symbol, target) : this.scanForward(symbol, target))
    await sleep(this.tradePollInterval)

    await this.tradeStore.loadTrades(storeOpts)
    await this.recursiveTick(symbol)
  }

  private async recursiveTick(symbol) {
    await this.tick(symbol)
  }

  private getNow() {
    return new Date().getTime()
  }

  private async scanBack(symbol: string, end: number) {
    const storeOpts = { exchange: this.exchange, symbol }
    // The next "to" is the previous "from"
    const to = await this.markerStore.getNextBackMarker(storeOpts)

    const trades = await this.exchangeProvider.getTrades(this.exchange, symbol, to)

    await this.tradeStore.insertTrades(storeOpts, trades)

    const from = Math.min(...trades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const { oldestTime } = await this.markerStore.saveMarker(storeOpts, to, from, trades)

    logger.debug(`${this.exchange}.${symbol} scanBack ${JSON.stringify({ now: new Date(oldestTime), end: new Date(end) })}`)

    if (oldestTime > end) {
      await this.scanBack(symbol, end)
    }
  }

  private async scanForward(symbol: string, start: number) {
    const storeOpts = { exchange: this.exchange, symbol }
    const from = await this.markerStore.getNextForwardMarker(storeOpts, start)

    const trades = await this.exchangeProvider.getTrades(this.exchange, symbol, from)

    if (!trades.length) return

    await this.tradeStore.insertTrades(storeOpts, trades)

    const to = Math.max(...trades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const { newestTime } = await this.markerStore.saveMarker(storeOpts, to, from, trades)

    logger.debug(`${this.exchange}.${symbol} scanForward ${JSON.stringify({ now: new Date(newestTime), end: new Date() })}`)

    // Always get current time so backfill can catch up to "now"
    if (newestTime < this.getNow()) {
      await this.scanForward(symbol, to)
    }
  }

  private async tickBack(symbol: string, target: number, lastFrom: number = null) {
    const storeOpts = { exchange: this.exchange, symbol }
    const trades = await this.exchangeProvider.getTrades(this.exchange, symbol, lastFrom)

    const filteredTrades = trades.filter(({ timestamp }) => timestamp > target)

    console.log(trades, filteredTrades)

    logger.silly(`${this.exchange}.${symbol} Got ${filteredTrades.length} new trade of ${trades.length} fetched.`)

    if (!filteredTrades.length) return

    await this.tradeStore.insertTrades(storeOpts, filteredTrades)

    const from = Math.min(...filteredTrades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    const to = Math.max(...filteredTrades.map((trade) => this.exchangeProvider.getTradeCursor(this.exchange, trade)))
    await this.markerStore.saveMarker(storeOpts, to, from, filteredTrades)

    if (filteredTrades.length === trades.length) await this.tickBack(symbol, target, from)
  }
}

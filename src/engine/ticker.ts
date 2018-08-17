import { ExchangeProvider } from '@exchange'
import { sleep, logger } from '@util'
import { wsServer } from '@lib'

enum TICKER_STATE {
  STOPPED,
  RUNNING,
}

export class TickerEngine {
  private readonly symbols: Map<string, TICKER_STATE> = new Map()

  constructor(private readonly exchangeProvider: ExchangeProvider, private readonly exchange: string) {}

  public start(symbol: string) {
    if (this.symbols.has(symbol) && this.symbols.get(symbol) === TICKER_STATE.RUNNING) return

    logger.info(`Ticker for ${symbol} on ${this.exchange} started.`)
    this.symbols.set(symbol, TICKER_STATE.RUNNING)

    this.tick(symbol)
  }

  public stop(symbol: string) {
    if (this.symbols.get(symbol) === TICKER_STATE.STOPPED) return
    logger.info(`Ticker for ${symbol} on ${this.exchange} stopped.`)
    this.symbols.set(symbol, TICKER_STATE.STOPPED)
  }

  private async tick(symbol: string) {
    if (this.symbols.get(symbol) === TICKER_STATE.STOPPED) return
    logger.info(`Getting ticker for ${symbol} on ${this.exchange}.`)
    const { exchange } = this
    const ticker = await this.exchangeProvider.fetchTicker(exchange, symbol)
    wsServer.broadcast('get-ticker', { exchange, symbol, ticker: ticker.close })

    await sleep(30000)
    await this.tick(symbol)
  }
}

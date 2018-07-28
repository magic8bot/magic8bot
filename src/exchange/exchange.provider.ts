import { ExchangeConf, ExchangeAuth } from '@m8bTypes'
import ccxt from 'ccxt'
import { WrappedExchange, wrapExchange } from './exchange.wrapper'
import { TradeItem } from '@lib'

const verbose = false

export class ExchangeProvider {
  private exchanges: Map<string, WrappedExchange> = new Map()

  constructor(exchangeConfs: ExchangeConf[]) {
    exchangeConfs.forEach(({ auth, exchangeName }) => {
      if (ccxt.exchanges.indexOf(exchangeName) === -1) throw new Error(`Invalid exchange: ${exchangeName}`)

      // no clean way to do this, afaik
      const reqKeys = this.getReqCreds((new ccxt[exchangeName]() as ccxt.Exchange).describe().requiredCredentials)

      if (!this.hasAllReqCreds(auth, reqKeys)) {
        throw new Error(`${exchangeName} missing required credentials. Requires: ${reqKeys.join(', ')}`)
      }

      const exchange = new ccxt[exchangeName]({ ...auth, enableRateLimit: true, verbose })
      this.exchanges.set(exchangeName, wrapExchange(exchangeName, exchange))
    })
  }

  public async getTrades(exchangeName: string, symbol: string, since: number) {
    const trades = await this.exchanges.get(exchangeName).fetchTrades(this.convertSymbol(symbol), since)

    return trades.map(({ id, timestamp, amount, price, side }) => {
      return { trade_id: Number(id), time: timestamp, size: amount, price, side } as TradeItem
    })
  }

  public async getBalances(exchangeName: string) {
    return this.exchanges.get(exchangeName).fetchBalance()
  }

  public async getOrderbook(exchangeName: string, symbol: string) {
    return this.exchanges.get(exchangeName).fetchOrderBook(this.convertSymbol(symbol))
  }

  public getScan(exchangeName: string) {
    return this.exchanges.get(exchangeName).scan
  }

  public getTradeCursor(exchangeName: string, trade: TradeItem) {
    return this.exchanges.get(exchangeName).getTradeCursor(trade)
  }

  private getReqCreds(requiredCredentials: Record<string, boolean>) {
    return Object.entries(requiredCredentials)
      .filter(([key, value]) => value)
      .map(([key]) => key)
  }

  private hasAllReqCreds(auth: ExchangeAuth, reqKeys: string[]) {
    return reqKeys.filter((key) => Boolean(auth[key])).length === reqKeys.length
  }

  private convertSymbol(symbol: string) {
    return symbol.replace('-', '/')
  }
}

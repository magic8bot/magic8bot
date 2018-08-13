import { ExchangeConf, ExchangeAuth } from '@m8bTypes'
import ccxt, { Trade, OrderBook } from 'ccxt'
import { ExchangeWrapper } from './exchange.wrapper'
import { ExchangeErrorHandler } from './exchange.error'
import { sleep, logger } from '@util'
import { wsServer, ExchangeCollection, ExchangeConfig } from '@lib'

const verbose = false

export interface OrderOpts {
  symbol: string
  type: 'market' | 'limit'
  side: 'buy' | 'sell'
  amount: number
  price?: number
}

export class ExchangeProvider {
  private exchanges: Map<string, ExchangeWrapper> = new Map()
  private errorHandler = new ExchangeErrorHandler()

  public addExchange({ auth, exchange }: ExchangeConfig) {
    if (ccxt.exchanges.indexOf(exchange) === -1) return this.error(`Invalid exchange: ${exchange}`)

    // no clean way to do this, afaik
    const reqKeys = this.getReqCreds((new ccxt[exchange]() as ccxt.Exchange).describe().requiredCredentials)

    if (!this.hasAllReqCreds(auth, reqKeys)) return this.error(`${exchange} missing required credentials. Requires: ${reqKeys.join(', ')}`)

    const exchangeConnection = new ccxt[exchange]({ ...auth, verbose })
    this.exchanges.set(exchange, new ExchangeWrapper(exchange, exchangeConnection))
    return true
  }

  public getTrades(exchange: string, symbol: string, since: number) {
    const fn = () => this.exchanges.get(exchange).fetchTrades(symbol, since)
    return this.retry(fn)
  }

  public getBalances(exchange: string) {
    const fn = () => this.exchanges.get(exchange).fetchBalance()
    return this.retry(fn)
  }

  public getOrderbook(exchange: string, symbol: string) {
    const fn = () => this.exchanges.get(exchange).fetchOrderBook(symbol)
    return this.retry(fn)
  }

  public placeOrder(exchangeName: string, { symbol, type, side, amount, price }: OrderOpts) {
    const fn = () => this.exchanges.get(exchangeName).createOrder(symbol, type, side, amount, price)
    return this.retry(fn)
  }

  public checkOrder(exchange: string, orderId: string) {
    const fn = () => this.exchanges.get(exchange).checkOrder(orderId)
    return this.retry(fn)
  }

  public cancelOrder(exchange: string, orderId: string) {
    const fn = () => this.exchanges.get(exchange).cancelOrder(orderId)
    return this.retry(fn)
  }

  public getScan(exchange: string) {
    return this.exchanges.get(exchange).scan
  }

  public getTradeCursor(exchange: string, trade: Trade) {
    return this.exchanges.get(exchange).getTradeCursor(trade)
  }

  public amountToPrecision(amount: number) {
    return Math.floor(amount * 100000000) / 100000000
  }

  public priceToPrecision(exchange: string, symbol: string, price: number) {
    return this.exchanges.get(exchange).priceToPrecision(symbol, price)
  }

  public getLimits(exchangeName: string, symbol: string) {
    return this.exchanges.get(exchangeName).getLimits(symbol)
  }

  private async retry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> | undefined {
    if (attempt > 5) return

    try {
      return await fn()
    } catch (e) {
      if (this.errorHandler.catch(e)) {
        const backoff = this.getExponentialBackoff(attempt)
        await sleep(backoff)
        return this.retry(fn, attempt + 1)
      }
    }
  }

  private getExponentialBackoff(attempt: number): number {
    return Array(attempt)
      .fill(3)
      .reduce((acc, curr) => acc * curr, 50)
  }

  private getReqCreds(requiredCredentials: Record<string, boolean>) {
    return Object.entries(requiredCredentials)
      .filter(([key, value]) => value)
      .map(([key]) => key)
  }

  private hasAllReqCreds(auth: ExchangeAuth, reqKeys: string[]) {
    return reqKeys.filter((key) => Boolean(auth[key])).length === reqKeys.length
  }

  private error(error: string) {
    logger.error(error)
    wsServer.broadcast('error', { error })
    return false
  }
}

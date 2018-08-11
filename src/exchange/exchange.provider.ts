import { ExchangeConf, ExchangeAuth } from '@m8bTypes'
import ccxt, { Trade, OrderBook } from 'ccxt'
import { ExchangeWrapper } from './exchange.wrapper'
import { ExchangeErrorHandler } from './exchange.error'
import { sleep } from '@util'

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

  constructor(exchangeConfs: ExchangeConf[]) {
    exchangeConfs.forEach(({ auth, exchangeName }) => {
      if (ccxt.exchanges.indexOf(exchangeName) === -1) throw new Error(`Invalid exchange: ${exchangeName}`)

      // no clean way to do this, afaik
      const reqKeys = this.getReqCreds((new ccxt[exchangeName]() as ccxt.Exchange).describe().requiredCredentials)

      if (!this.hasAllReqCreds(auth, reqKeys)) {
        throw new Error(`${exchangeName} missing required credentials. Requires: ${reqKeys.join(', ')}`)
      }

      const exchange = new ccxt[exchangeName]({ ...auth, enableRateLimit: true, verbose })
      this.exchanges.set(exchangeName, new ExchangeWrapper(exchangeName, exchange))
    })
  }

  public getTrades(exchangeName: string, symbol: string, since: number) {
    const fn = () => this.exchanges.get(exchangeName).fetchTrades(symbol, since)
    return this.retry(fn)
  }

  public getBalances(exchangeName: string) {
    const fn = () => this.exchanges.get(exchangeName).fetchBalance()
    return this.retry(fn)
  }

  public getOrderbook(exchangeName: string, symbol: string): OrderBook {
    const fn = () => this.exchanges.get(exchangeName).fetchOrderBook(symbol)
    return this.retry(fn)
  }

  public placeOrder(exchangeName: string, { symbol, type, side, amount, price }: OrderOpts) {
    console.log({ amount, price, cost: amount * price })
    const fn = () => this.exchanges.get(exchangeName).createOrder(symbol, type, side, amount, price)
    return this.retry(fn)
  }

  public checkOrder(exchangeName: string, orderId: string) {
    const fn = () => this.exchanges.get(exchangeName).checkOrder(orderId)
    return this.retry(fn)
  }

  public cancelOrder(exchangeName: string, orderId: string) {
    const fn = () => this.exchanges.get(exchangeName).cancelOrder(orderId)
    return this.retry(fn)
  }

  public getScan(exchangeName: string) {
    return this.exchanges.get(exchangeName).scan
  }

  public getTradeCursor(exchangeName: string, trade: Trade) {
    return this.exchanges.get(exchangeName).getTradeCursor(trade)
  }

  public amountToPrecision(amount: number) {
    return Math.floor(amount * 100000000) / 100000000
  }

  public priceToPrecision(exchangeName: string, symbol: string, price: number) {
    return this.exchanges.get(exchangeName).priceToPrecision(symbol, price)
  }

  public getLimits(exchangeName: string, symbol: string) {
    return this.exchanges.get(exchangeName).getLimits(symbol)
  }

  private async retry(fn: () => void, attempt = 0) {
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

  private getExponentialBackoff(attempt: number) {
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
}

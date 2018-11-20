import { ExchangeAuth } from '@m8bTypes'
import ccxt, { Trade } from 'ccxt'
import { ExchangeWrapper } from './exchange.wrapper'
import { ExchangeErrorHandler } from './exchange.error'
import { wsServer, ExchangeConfig } from '@lib'
import { sleep, logger } from '@util'
import { ChaosXcg } from '../seed/chaos.exchange'
import { CurrencyExchange } from './exchangeTypes/currencyExchange'
import { LeverageExchange } from './exchangeTypes/leverageExchange'

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

  public async addExchange(exchangeConfig: ExchangeConfig) {
    const { auth, exchange } = exchangeConfig
    if (this.exchanges.has(exchange)) return this.error(`Exchange already added: ${exchange}`)

    if (exchange === 'chaos') {
      const chaos: any = new ChaosXcg()
      await chaos.connect({})
      this.exchanges.set(exchange, new CurrencyExchange(exchange, chaos))
      return true
    }

    if (ccxt.exchanges.indexOf(exchange) === -1) {
      logger.error(`invalid exchange ${exchange}, list: ${ccxt.exchanges}`)
      return this.error(`Invalid exchange: ${exchange}`)
    }

    // no clean way to do this, afaik
    const reqKeys = this.getReqCreds((new ccxt[exchange]() as ccxt.Exchange).describe().requiredCredentials)

    if (!this.hasAllReqCreds(auth, reqKeys)) return this.error(`${exchange} missing required credentials. Requires: ${reqKeys.join(', ')}`)

    const exchangeConnection = new ccxt[exchange]({ ...auth, verbose, enableRateLimit: true })
    if (exchangeConfig.useTestEnvironment) {
      logger.debug(`enabling test environment for exchange ${exchangeConfig.exchange}`)
      exchangeConnection.urls.api = exchangeConnection.urls.test
    }

    if (exchangeConfig.hasOwnProperty('leverage')) {
      this.exchanges.set(exchange, new LeverageExchange(exchange, exchangeConnection))
    } else {
      this.exchanges.set(exchange, new CurrencyExchange(exchange, exchangeConnection))
    }
    return true
  }

  public async replaceExchange(exchangeConfig: ExchangeConfig) {
    this.exchanges.delete(exchangeConfig.exchange)
    await this.addExchange(exchangeConfig)
  }

  public getSymbols(exchange: string) {
    const exchangeInstance = this.exchanges.get(exchange)
    if (!exchangeInstance) return this.error(`Exchange ${exchange} has not been instanced`)
    return exchangeInstance.getSymbols()
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

  public checkOrder(exchange: string, orderId: string, symbol: string) {
    const fn = () => this.exchanges.get(exchange).checkOrder(orderId, symbol)
    return this.retry(fn)
  }

  public cancelOrder(exchange: string, orderId: string, symbol: string) {
    const fn = () => this.exchanges.get(exchange).cancelOrder(orderId, symbol)
    return this.retry(fn)
  }

  public fetchTicker(exchange: string, symbol: string) {
    const fn = () => this.exchanges.get(exchange).fetchTicker(symbol)
    return this.retry(fn)
  }

  public getScan(exchange: string) {
    return this.exchanges.get(exchange).scan
  }

  public getTradeCursor(exchange: string, trade: Trade) {
    return this.exchanges.get(exchange).getTradeCursor(trade)
  }

  public amountToPrecision(exchange: string, amount: number, currentPrice: number) {
    return this.exchanges.get(exchange).amountToPrecision(amount, currentPrice)
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
    return { error }
  }
}

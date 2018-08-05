import { ExchangeConf, ExchangeAuth } from '@m8bTypes'
import ccxt, { Trade } from 'ccxt'
import { ExchangeWrapper } from './exchange.wrapper'

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

  public async getTrades(exchangeName: string, symbol: string, since: number) {
    return this.exchanges.get(exchangeName).fetchTrades(symbol, since)
  }

  public async getBalances(exchangeName: string) {
    return this.exchanges.get(exchangeName).fetchBalance()
  }

  public async getOrderbook(exchangeName: string, symbol: string) {
    return this.exchanges.get(exchangeName).fetchOrderBook(symbol)
  }

  public placeOrder(exchangeName: string, { symbol, type, side, amount, price }: OrderOpts) {
    console.log({ amount, price, cost: amount * price })
    return this.exchanges.get(exchangeName).createOrder(symbol, type, side, amount, price)
  }

  public async checkOrder(exchangeName: string, orderId: string) {
    return this.exchanges.get(exchangeName).checkOrder(orderId)
  }

  public async cancelOrder(exchangeName: string, orderId: string) {
    return this.exchanges.get(exchangeName).cancelOrder(orderId)
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

  private getReqCreds(requiredCredentials: Record<string, boolean>) {
    return Object.entries(requiredCredentials)
      .filter(([key, value]) => value)
      .map(([key]) => key)
  }

  private hasAllReqCreds(auth: ExchangeAuth, reqKeys: string[]) {
    return reqKeys.filter((key) => Boolean(auth[key])).length === reqKeys.length
  }
}

import { Exchange, Trade, Order } from 'ccxt'
import { coinbasepro, binance, chaos } from './adapters'
import { ExchangeAdapter } from './adapters/base'
import { OrderWithTrades } from '@lib'
import Bottleneck from 'bottleneck'
import { logger } from '@util'

const adapters: Record<string, ExchangeAdapter> = { binance, coinbasepro, chaos }

export class ExchangeWrapper {
  public scan: 'back' | 'forward'
  private adapter: ExchangeAdapter
  private exchangeConnection: Exchange
  private bottleneck: Bottleneck

  constructor(exchange: string, exchangeConnectionFn: (opts: Record<string, any>) => Exchange) {
    if (!(exchange in adapters)) throw new Error(`No adapter for ${exchange}.`)
    this.adapter = adapters[exchange]
    this.exchangeConnection = exchangeConnectionFn(this.adapter.options || {})
    this.scan = this.adapter.scan
    this.bottleneck = new Bottleneck({ minTime: this.adapter.ratelimit })
  }

  public getTradeCursor(trade: Trade) {
    return this.adapter.getTradeCursor(trade)
  }

  public async getSymbols() {
    const symbols = this.exchangeConnection.symbols
    if (symbols) return symbols

    await this.exchangeConnection.loadMarkets()
    return this.exchangeConnection.symbols
  }

  public async fetchTrades(symbol: string, start: number) {
    const params = this.adapter.mapTradeParams(start)
    const fn = () => this.exchangeConnection.fetchTrades(symbol, undefined, undefined, params)
    const res = await this.bottleneck.schedule(fn)

    // const debug = { name: 'fetchTrades', req: { symbol, params }, res: res.length }
    // logger.silly(JSON.stringify(debug))

    return res
  }

  public async fetchMyTrades(symbol: string) {
    const fn = () => this.exchangeConnection.fetchMyTrades(symbol)
    const res = await this.bottleneck.schedule(fn)

    const debug = { name: 'fetchMyTrades', req: {}, res }
    logger.silly(JSON.stringify(debug))

    return res
  }

  public async fetchBalance() {
    const fn = () => this.exchangeConnection.fetchBalance()
    const res = await this.bottleneck.schedule(fn)

    const debug = { name: 'fetchBalance', req: {}, res }
    logger.silly(JSON.stringify(debug))

    return res
  }

  public async fetchOrderBook(symbol: string) {
    const fn = () => this.exchangeConnection.fetchOrderBook(symbol)
    const res = await this.bottleneck.schedule(fn)

    const debug = { name: 'fetchOrderBook', req: { symbol }, res }
    logger.silly(JSON.stringify(debug))

    return res
  }

  public async createOrder(symbol: string, type: string, side: 'buy' | 'sell', amount: number, price: number): Promise<Order> {
    const params = { newOrderRespType: 'FULL' }
    const fn = () => this.exchangeConnection.createOrder(symbol, type, side, amount, price, params)
    const res = await this.bottleneck.schedule(fn)

    const debug = { name: 'createOrder', req: { symbol, type, side, amount, price }, res }
    logger.silly(JSON.stringify(debug))

    return res
  }

  public async checkOrder(orderId: string, symbol: string): Promise<OrderWithTrades> {
    const fn = () => this.exchangeConnection.fetchOrder(orderId, symbol)
    const res: any = await this.bottleneck.schedule(fn)

    const debug = { name: 'checkOrder', req: { orderId }, res }
    logger.silly(JSON.stringify(debug))

    return res
  }

  public async cancelOrder(orderId: string) {
    const fn = () => this.exchangeConnection.cancelOrder(orderId)
    const res = await this.bottleneck.schedule(fn)

    const debug = { name: 'cancelOrder', req: { orderId }, res }
    logger.silly(JSON.stringify(debug))

    return res
  }

  public async fetchTicker(symbol: string) {
    const fn = () => this.exchangeConnection.fetchTicker(symbol)
    const res = await this.bottleneck.schedule(fn)

    const debug = { name: 'fetchTicker', req: { symbol }, res }
    logger.silly(JSON.stringify(debug))

    return res
  }

  public priceToPrecision(symbol: string, amount: number) {
    return Number(this.exchangeConnection.priceToPrecision(symbol, amount))
  }

  public getLimits(symbol: string) {
    return this.exchangeConnection.market(symbol).limits
  }
}

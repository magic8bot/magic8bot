import { Exchange, Trade, Order } from 'ccxt'
import { gdax, binance, chaos, bitmex } from './adapters'
import { ExchangeAdapter } from './adapters/base'
import { OrderWithTrades } from '@lib'
import Bottleneck from 'bottleneck'
import { logger } from '@util'

// const adapters: Record<string, ExchangeAdapter> = { binance, gdax, chaos, bitmex }

export abstract class ExchangeWrapper {
  public scan: 'back' | 'forward'
  protected bottleneck: Bottleneck
  private adapter: ExchangeAdapter

  constructor(exchange: string, protected readonly exchangeConnection: Exchange, adapters: Record<string, ExchangeAdapter>) {
    if (!(exchange in adapters)) throw new Error(`No adapter for ${exchange}.`)
    this.adapter = adapters[exchange]
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
    // logger.debug(JSON.stringify(debug))

    return res
  }

  public async fetchBalance() {
    const fn = () => this.exchangeConnection.fetchBalance()
    const res = await this.bottleneck.schedule(fn)

    const debug = { name: 'fetchBalance', req: {}, res }
    logger.debug(JSON.stringify(debug))

    return res
  }

  public async fetchOrderBook(symbol: string) {
    const fn = () => this.exchangeConnection.fetchOrderBook(symbol)
    const res = await this.bottleneck.schedule(fn)

    const debug = { name: 'fetchOrderBook', req: { symbol }, res }
    logger.debug(JSON.stringify(debug))

    return res
  }

  public abstract async createOrder(symbol: string, type: string, side: string, amount: number, price: number): Promise<Order>

  public async checkOrder(orderId: string, symbol: string): Promise<OrderWithTrades> {
    const fn = () => this.exchangeConnection.fetchOrder(orderId, symbol)
    const res: any = await this.bottleneck.schedule(fn)

    const debug = { name: 'checkOrder', req: { orderId }, res }
    logger.debug(JSON.stringify(debug))

    return res
  }

  public async cancelOrder(orderId: string, symbol: string) {
    const fn = () => this.exchangeConnection.cancelOrder(orderId, symbol)
    const res = await this.bottleneck.schedule(fn)

    const debug = { name: 'cancelOrder', req: { orderId }, res }
    logger.debug(JSON.stringify(debug))

    return res
  }

  public async fetchTicker(symbol: string) {
    const fn = () => this.exchangeConnection.fetchTicker(symbol)
    const res = await this.bottleneck.schedule(fn)

    const debug = { name: 'fetchTicker', req: { symbol }, res }
    logger.debug(JSON.stringify(debug))

    return res
  }

  public priceToPrecision(symbol: string, amount: number) {
    return Number(this.exchangeConnection.priceToPrecision(symbol, amount))
  }

  public getLimits(symbol: string) {
    return this.exchangeConnection.market(symbol).limits
  }

  public abstract amountToPrecision(amount: number, currentPrice: number)
}

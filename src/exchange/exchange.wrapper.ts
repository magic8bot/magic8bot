import { Exchange, Trade, Order } from 'ccxt'
import { gdax, binance } from './adapters'
import { ExchangeAdapter } from './adapters/base'
import { OrderWithTrades } from '@lib'
import Bottleneck from 'bottleneck'

const adapters: Record<string, ExchangeAdapter> = { binance, gdax }

export class ExchangeWrapper {
  public scan: 'back' | 'forward'
  private adapter: ExchangeAdapter
  private bottleneck: Bottleneck

  constructor(exchange: string, private readonly exchangeConnection: Exchange) {
    if (!(exchange in adapters)) throw new Error(`No adapter for ${exchange}.`)
    this.adapter = adapters[exchange]
    this.scan = this.adapter.scan
    this.bottleneck = new Bottleneck({ minTime: this.adapter.ratelimit })
  }

  public getTradeCursor(trade: Trade) {
    return this.adapter.getTradeCursor(trade)
  }

  public fetchTrades(symbol: string, start: number) {
    const params = this.adapter.mapTradeParams(start)
    const fn = () => this.exchangeConnection.fetchTrades(symbol, undefined, undefined, params)
    return this.bottleneck.schedule(fn)
  }

  public fetchBalance() {
    const fn = () => this.exchangeConnection.fetchBalance()
    return this.bottleneck.schedule(fn)
  }

  public fetchOrderBook(symbol: string) {
    const fn = () => this.exchangeConnection.fetchOrderBook(symbol)
    return this.bottleneck.schedule(fn)
  }

  public createOrder(symbol: string, type: string, side: string, amount: number, price: number): Promise<Order> {
    const fn = () => this.exchangeConnection.createOrder(symbol, type, side, amount, price)
    return this.bottleneck.schedule(fn)
  }

  public checkOrder(orderId: string): Promise<OrderWithTrades> {
    const fn = () => this.exchangeConnection.fetchOrder(orderId)
    return this.bottleneck.schedule(fn)
  }

  public cancelOrder(orderId: string) {
    const fn = () => this.exchangeConnection.cancelOrder(orderId)
    return this.bottleneck.schedule(fn)
  }

  public priceToPrecision(symbol: string, amount: number) {
    return Number(this.exchangeConnection.priceToPrecision(symbol, amount))
  }

  public getLimits(symbol: string) {
    return this.exchangeConnection.market(symbol).limits
  }
}

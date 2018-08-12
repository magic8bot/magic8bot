import { Exchange, Trade, Order, Balances, OrderBook } from 'ccxt'
import { gdax, binance } from './adapters'
import { ExchangeAdapter } from './adapters/base'
import { OrderWithTrades } from '@lib'
import Bottleneck from 'bottleneck'

const adapters: Record<string, ExchangeAdapter> = { binance, gdax }

export class ExchangeWrapper {
  public scan: 'back' | 'forward'
  private adapter: ExchangeAdapter
  private bottleneck: Bottleneck

  constructor(exchangeName: string, private readonly exchange: Exchange) {
    if (!(exchangeName in adapters)) throw new Error(`No adapter for ${exchangeName}.`)
    this.adapter = adapters[exchangeName]
    this.scan = this.adapter.scan
    this.bottleneck = new Bottleneck({ minTime: this.adapter.ratelimit })
  }

  public getTradeCursor(trade: Trade) {
    return this.adapter.getTradeCursor(trade)
  }

  public fetchTrades(symbol: string, start: number): Promise<Trade[]> {
    const params = this.adapter.mapTradeParams(start)
    const fn = () => this.exchange.fetchTrades(symbol, undefined, undefined, params)
    return this.bottleneck.schedule(fn)
  }

  public fetchBalance(): Promise<Balances> {
    const fn = () => this.exchange.fetchBalance()
    return this.bottleneck.schedule(fn)
  }

  public fetchOrderBook(symbol: string): Promise<OrderBook> {
    const fn = () => this.exchange.fetchOrderBook(symbol)
    return this.bottleneck.schedule(fn)
  }

  public createOrder(symbol: string, type: string, side: string, amount: number, price: number): Promise<Order> {
    const fn = () => this.exchange.createOrder(symbol, type, side, amount, price)
    return this.bottleneck.schedule(fn)
  }

  public checkOrder(orderId: string): Promise<OrderWithTrades> {
    const fn = () => this.exchange.fetchOrder(orderId)
    return this.bottleneck.schedule(fn)
  }

  public cancelOrder(orderId: string): Promise<void> {
    const fn = () => this.exchange.cancelOrder(orderId)
    return this.bottleneck.schedule(fn)
  }

  public priceToPrecision(symbol: string, amount: number) {
    return Number(this.exchange.priceToPrecision(symbol, amount))
  }

  public getLimits(symbol: string) {
    return this.exchange.market(symbol).limits
  }
}

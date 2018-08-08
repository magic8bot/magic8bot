import { Exchange, Trade, Order } from 'ccxt'
import { gdax, binance } from './adapters'
import { ExchangeAdapter } from './adapters/base'
import { OrderWithTrades } from '@lib'

const adapters: Record<string, ExchangeAdapter> = { binance, gdax }

export class ExchangeWrapper {
  public scan: 'back' | 'forward'

  private adapter: ExchangeAdapter
  constructor(exchangeName: string, private readonly exchange: Exchange) {
    if (!(exchangeName in adapters)) throw new Error(`No adapter for ${exchangeName}.`)
    this.adapter = adapters[exchangeName]
    this.scan = this.adapter.scan
  }

  public getTradeCursor(trade: Trade) {
    return this.adapter.getTradeCursor(trade)
  }

  public fetchTrades(symbol: string, start: number) {
    const params = this.adapter.mapTradeParams(start)
    return this.exchange.fetchTrades(symbol, undefined, undefined, params)
  }

  public fetchBalance() {
    return this.exchange.fetchBalance()
  }

  public fetchOrderBook(symbol: string) {
    return this.exchange.fetchOrderBook(symbol)
  }

  public createOrder(symbol: string, type: string, side: string, amount: number, price: number): Promise<Order> {
    return this.exchange.createOrder(symbol, type, side, amount, price)
  }

  public checkOrder(orderId: string): Promise<OrderWithTrades> {
    return this.exchange.fetchOrder(orderId)
  }

  public cancelOrder(orderId: string): Promise<void> {
    return this.exchange.cancelOrder(orderId)
  }

  public priceToPrecision(symbol: string, amount: number) {
    return this.exchange.priceToPrecision(symbol, amount)
  }
}

import { Exchange, Trade, Balances, OrderBook, Order } from 'ccxt'
import { gdax, binance } from './adapters'
import { ExchangeAdapter } from './adapters/base'
import { OrderWithTrades } from '@lib'

const adapters: Record<string, ExchangeAdapter> = { binance, gdax }

type Adapter = ExchangeAdapter & {
  fetchTrades: (symbol: string, start: number) => Promise<Trade[]>
  fetchBalance: () => Promise<Balances>
  fetchOrderBook: (symbol: string) => Promise<OrderBook>
  createOrder: (symbol: string, type: string, side: string, amount: number, price?: number) => Promise<Order>
  checkOrder: (orderId: string) => Promise<OrderWithTrades>
  cancelOrder: (orderId: string) => Promise<void>
}

type FilterKeys<T, K extends keyof T> = { [P in keyof T]: P extends K ? never : P }[keyof T]
type Filter<T, K extends keyof T> = Pick<T, FilterKeys<T, K>>

export type WrappedExchange = Filter<Adapter, 'mapTradeParams'>

export const wrapExchange = (exchangeName: string, exchange: Exchange): WrappedExchange => {
  if (!(exchangeName in adapters)) throw new Error(`No adapter for ${exchangeName}.`)
  const adapter = adapters[exchangeName]

  return {
    scan: adapter.scan,
    getTradeCursor: adapter.getTradeCursor,

    fetchTrades: (symbol: string, start: number) => {
      const params = adapter.mapTradeParams(start)
      return exchange.fetchTrades(symbol, undefined, undefined, params)
    },

    fetchBalance: () => {
      return exchange.fetchBalance()
    },

    fetchOrderBook: (symbol: string) => {
      return exchange.fetchOrderBook(symbol)
    },

    createOrder: (symbol: string, type: string, side: string, amount: number, price: number) => {
      return !price
        ? exchange.createOrder(symbol, type, side, amount)
        : exchange.createOrder(symbol, type, side, amount, price)
    },

    checkOrder: (orderId: string): Promise<OrderWithTrades> => {
      return exchange.fetchOrder(orderId)
    },

    cancelOrder: (orderId: string): Promise<void> => {
      return exchange.cancelOrder(orderId)
    },
  }
}

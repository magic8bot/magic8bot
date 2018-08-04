import { Trade } from 'ccxt'
import { ExchangeAdapter, StreamExchangeAdapter } from './base'

export const gdax: ExchangeAdapter = {
  scan: 'back',

  mapTradeParams: (after: number) => {
    if (after === null) return null
    return { after }
  },

  getTradeCursor: (trade: Trade) => {
    return Number(trade.id)
  },
}

export const gdaxStream: StreamExchangeAdapter = {

  handleMessage(message: any) {
    console.log(message)
  },
  getSubscription(products: string[]) {
    return {
      type: 'subscribe',
      product_ids: products,
      channels: [
        'matches',
        'heartbeat',
        {
          name: 'matches',
          product_ids: products,
        },
      ],
    }
  },
}

import { Trade } from 'ccxt'
import { ExchangeAdapter } from './base'

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

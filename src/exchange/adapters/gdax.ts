import { Trade } from 'ccxt'
import { ExchangeAdapter } from './base'

export const gdax: ExchangeAdapter = {
  scan: 'back',
  ratelimit: 1000 / 3,

  mapTradeParams: (after: number) => {
    if (after === null) return null
    return { after }
  },

  getTradeCursor: (trade: Trade) => {
    return Number(trade.id)
  },
}

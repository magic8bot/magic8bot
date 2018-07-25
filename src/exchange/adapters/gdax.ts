import { TradeItem } from '@lib'
import { ExchangeAdapter } from './base'

export const gdax: ExchangeAdapter = {
  scan: 'back',

  mapTradeParams: (after: number) => {
    if (after === null) return null
    return { after }
  },

  getTradeCursor: (trade: TradeItem) => {
    return trade.trade_id
  },
}

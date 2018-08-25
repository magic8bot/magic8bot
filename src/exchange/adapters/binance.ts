import { Trade } from 'ccxt'
import { ExchangeAdapter, baseFields } from './base'
import { time } from '@util'

export const binance: ExchangeAdapter = {
  fields: [...baseFields],
  description: 'Binance Exchange is one of the fastest growing and most popular cryptocurrency exchanges in the world.',

  scan: 'forward',
  ratelimit: 500,

  mapTradeParams: (startTime: number) => {
    if (startTime === null) return null
    const endTime = time(startTime).add.h(1)
    return { startTime, endTime }
  },

  getTradeCursor: (trade: Trade) => {
    return trade.timestamp
  },
}

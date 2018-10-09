import { Trade } from 'ccxt'
import { ExchangeAdapter, baseFields } from './base'
import { time } from '@util'

export const bitmex: ExchangeAdapter = {
  fields: [...baseFields],
  description: 'Bitmex',

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

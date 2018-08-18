import { Trade } from 'ccxt'
import { ExchangeAdapter } from './base'
import { time } from '@util'

export const chaos: ExchangeAdapter = {
  scan: 'forward',
  ratelimit: 500,

  mapTradeParams: (startTime: number) => {
    if (startTime === null) return null
    const end = time(startTime).add.h(1)
    const now = new Date().getTime()
    const endTime = end > now ? now : end
    return { startTime, endTime }
  },

  getTradeCursor: (trade: Trade) => {
    return trade.timestamp
  },
}

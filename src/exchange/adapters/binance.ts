import { Trade } from 'ccxt'
import { ExchangeAdapter } from './base'
import { time } from '@util'

export const binance: ExchangeAdapter = {
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

import { Trade } from 'ccxt'

export interface ExchangeAdapter {
  scan: 'back' | 'forward'
  ratelimit: number
  getTradeCursor: (trade: Trade) => number
  mapTradeParams: (start: number) => { [key: string]: number }
}

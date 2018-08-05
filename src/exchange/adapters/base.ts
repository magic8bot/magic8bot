import { Trade } from 'ccxt'

export interface ExchangeAdapter {
  scan: 'back' | 'forward'
  getTradeCursor: (trade: Trade) => number
  mapTradeParams: (start: number) => { [key: string]: number }
  roundOrderAmount: (amount: number) => number
}

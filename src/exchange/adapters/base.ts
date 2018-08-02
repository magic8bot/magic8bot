import { Trade } from 'ccxt'

export interface ExchangeAdapter {
  scan: 'back' | 'forward'
  mapTradeParams: (start: number) => { [key: string]: number }
  getTradeCursor: (trade: Trade) => number
}

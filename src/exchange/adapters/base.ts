import { TradeItem } from '@lib'

export interface ExchangeAdapter {
  scan: 'back' | 'forward'
  mapTradeParams: (start: number) => { [key: string]: number }
  getTradeCursor: (trade: TradeItem) => number
}

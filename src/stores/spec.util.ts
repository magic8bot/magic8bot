import { randomInRange, randomChoice } from '@util'
import { TradeItem } from '@lib'

export const now = 1532266820000
export const makeNewOrder = (t: number): TradeItem => {
  return {
    time: t,
    trade_id: Math.random(),
    size: randomInRange(1, 10000) / 1000,
    price: randomInRange(100, 200),
    side: randomChoice(['buy', 'sell']),
  }
}

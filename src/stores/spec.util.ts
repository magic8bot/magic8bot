import { Trade } from 'ccxt'
import { randomInRange, randomChoice } from '@util'

export const now = 1532266820000
export const makeNewOrder = (t: number): Partial<Trade> => {
  return {
    timestamp: t,
    id: String(Math.random()),
    amount: randomInRange(1, 10000) / 1000,
    price: randomInRange(100, 200),
    side: randomChoice(['buy', 'sell']),
  }
}

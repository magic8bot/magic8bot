import { PeriodStore } from './period.store'
import { randomInRange, randomChoice } from '@util'
import { TradeItem } from '@lib'
import { time } from '../util/time'

const now = 1532266820000

const makeNewOrder = (t: number): TradeItem => {
  return {
    time: t,
    trade_id: Math.random(),
    size: randomInRange(1, 10000) / 1000,
    price: randomInRange(100, 200),
    side: randomChoice(['buy', 'sell']),
  }
}

describe('OrderStore store', () => {
  let periodStore: PeriodStore

  beforeEach(() => {
    periodStore = new PeriodStore('1m')
  })

  it('should add trades', async (done) => {
    expect(async () => {
      await periodStore.addTrade(makeNewOrder(now))
      done()
    }).not.toThrowError()
  })

  it('should not leak between tests', async (done) => {
    expect(periodStore.periods.length).toEqual(0)

    done()
  })

  it('should init with trades', async (done) => {
    const orders = [...Array(3).fill(0)].map((v, i) => makeNewOrder(time(now).sub.s(i * 10)))

    periodStore.initPeriods(orders)

    expect(periodStore.periods.length).toEqual(1)

    done()
  })

  it('should set new periods', async (done) => {
    const orders = [...Array(9).fill(0)].map((v, i) => makeNewOrder(time(now).sub.s(i * 10))).reverse()
    orders.forEach((order) => periodStore.addTrade(order))

    expect(periodStore.periods.length).toEqual(2)

    done()
  })
})

import { PeriodStore } from './period.store'
import { randomInRange, randomChoice } from '@util'
import { TradeItem } from '@lib';

const makeNewOrder = (time: number): TradeItem => {
  return {
    time,
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
      await periodStore.addTrade(makeNewOrder(new Date().getTime()))
      done()
    }).not.toThrowError()
  })

  it('should not leak between tests', async (done) => {
    expect(periodStore.periods.length).toEqual(0)

    done()
  })

  it('should init with trades', async (done) => {
    const now = new Date().getTime();
    const items = [
      makeNewOrder(now - (120 * 1000 + 1)),
      makeNewOrder(now - (60 * 1000 + 5)),
      makeNewOrder(now - (60 * 1000 + 1)),
      makeNewOrder(now)
    ]

    periodStore.initPeriods(items)
    expect(periodStore.periods.length).toEqual(3)

    periodStore.addTrade(makeNewOrder(now + 60 * 1000))
    expect(periodStore.periods.length).toEqual(4)

    done()
  })

  it('should set new periods', async (done) => {
    const now = new Date().getTime();
    periodStore.addTrade(makeNewOrder(now - (120 * 1000 + 1)))
    periodStore.addTrade(makeNewOrder(now - (60 * 1000 + 5)))
    periodStore.addTrade(makeNewOrder(now - (60 * 1000 + 1)))
    periodStore.addTrade(makeNewOrder(now))

    expect(periodStore.periods.length).toEqual(3)

    done()
  })
})

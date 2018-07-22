import { PeriodStore } from './period.store'
import { randomInRange, randomChoice } from '@util'

const makeNewOrder = (time: number) => {
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
    // @todo(notVitaliy): Add this test
    done()
  })

  it('should set new periods', async (done) => {
    // @todo(notVitaliy): Add this test
    done()
  })
})

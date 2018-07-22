import { PeriodStore } from './period.store'
import { time } from '@util'
import { now, makeNewOrder } from './spec.util'

describe('PeriodStore', () => {
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
    const trades = [...Array(3).fill(0)].map((v, i) => makeNewOrder(time(now).sub.s(i * 10)))

    periodStore.initPeriods(trades)

    expect(periodStore.periods.length).toEqual(1)

    done()
  })

  it('should set new periods', async (done) => {
    const trades = [...Array(9).fill(0)].map((v, i) => makeNewOrder(time(now).sub.s(i * 10))).reverse()
    trades.forEach((order) => periodStore.addTrade(order))

    expect(periodStore.periods.length).toEqual(2)

    done()
  })
})

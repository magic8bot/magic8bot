import { PeriodStore } from './period.store'
import { time } from '@util'
import { now, makeNewOrder } from './spec.util'
import { timebucket } from '@magic8bot/timebucket'

describe('PeriodStore', () => {
  let periodStore: PeriodStore

  beforeEach(() => {
    periodStore = new PeriodStore('1m', 'test', 'test', 'test', 3)
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

  it('should delete old periods', async (done) => {
    // Create a trade for every period, total of 3
    const trades = [...Array(3).fill(0)].map((v, i) => makeNewOrder(time(now).sub.m(i + 1))).reverse()
    trades.forEach((order, index) => {
      periodStore.addTrade(order)
      // periodStore should keep 2 lookbacks and the third period (first inserted) should be dropped
      if (index < 2) expect(periodStore.periods.length).toEqual(index + 1)
      else expect(periodStore.periods.length).toEqual(2)
    })
    done()
  })

  it('check for order of periods', async (done) => {
    const trades = [...Array(4).fill(0)].map((v, i) => makeNewOrder(time(now).sub.m(i + 1))).reverse()

    const buckets = trades.map((trade) =>
      timebucket(trade.time)
        .resize('1m')
        .toMilliseconds()
    )

    periodStore.addTrade(trades[0])
    expect(periodStore.periods[0].time).toEqual(buckets[0])

    periodStore.addTrade(trades[1])
    expect(periodStore.periods[0].time).toEqual(buckets[1])
    expect(periodStore.periods[1].time).toEqual(buckets[1] - 60000)

    periodStore.addTrade(trades[2])
    expect(periodStore.periods[0].time).toEqual(buckets[2])
    expect(periodStore.periods[1].time).toEqual(buckets[2] - 60000)

    periodStore.addTrade(trades[3])
    expect(periodStore.periods[0].time).toEqual(buckets[3])
    expect(periodStore.periods[1].time).toEqual(buckets[3] - 60000)

    done()
  })
})

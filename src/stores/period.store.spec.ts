import { PeriodStore } from './period.store'
import { time } from '@util'
import { now, makeNewOrder } from './spec.util'
import { timebucket } from '@magic8bot/timebucket'
import { Trade } from 'ccxt'

describe('PeriodStore', () => {
  let periodStore: PeriodStore

  beforeEach(() => {
    periodStore = new PeriodStore()
    periodStore.addSymbol('test', 'test', 'test', { period: '1m', lookbackSize: 2 })
  })

  it('should add trades', () => {
    periodStore.addTrade('test.test.test', makeNewOrder(now) as Trade)
    expect(periodStore.periods.get('test.test.test').length).toEqual(1)
  })

  it('should set new periods', async (done) => {
    const trades = [...Array(9).fill(0)].map((v, i) => makeNewOrder(time(now).sub.s(i * 10))).reverse()
    trades.forEach((trade) => periodStore.addTrade('test.test.test', trade as Trade))

    expect(periodStore.periods.get('test.test.test').length).toEqual(2)

    done()
  })

  it('should delete old periods', async (done) => {
    // Create a trade for every period, total of 3
    const trades = [...Array(3).fill(0)].map((v, i) => makeNewOrder(time(now).sub.m(i + 1))).reverse()
    trades.forEach((trade, index) => {
      periodStore.addTrade('test.test.test', trade as Trade)
      // periodStore should keep 2 lookbacks and the third period (first inserted) should be dropped
      if (index < 2) expect(periodStore.periods.get('test.test.test').length).toEqual(index + 1)
      else expect(periodStore.periods.get('test.test.test').length).toEqual(2)
    })
    done()
  })

  it('check for order of periods', async (done) => {
    const trades = [...Array(4).fill(0)].map((v, i) => makeNewOrder(time(now).sub.m(i + 1))).reverse()

    const buckets = trades.map((trade) =>
      timebucket(trade.timestamp)
        .resize('1m')
        .toMilliseconds()
    )

    periodStore.addTrade('test.test.test', trades[0] as Trade)
    expect(periodStore.periods.get('test.test.test')[0].time).toEqual(buckets[0])

    periodStore.addTrade('test.test.test', trades[1] as Trade)
    expect(periodStore.periods.get('test.test.test')[0].time).toEqual(buckets[1])
    expect(periodStore.periods.get('test.test.test')[1].time).toEqual(buckets[1] - 60000)

    periodStore.addTrade('test.test.test', trades[2] as Trade)
    expect(periodStore.periods.get('test.test.test')[0].time).toEqual(buckets[2])
    expect(periodStore.periods.get('test.test.test')[1].time).toEqual(buckets[2] - 60000)

    periodStore.addTrade('test.test.test', trades[3] as Trade)
    expect(periodStore.periods.get('test.test.test')[0].time).toEqual(buckets[3])
    expect(periodStore.periods.get('test.test.test')[1].time).toEqual(buckets[3] - 60000)

    done()
  })
})

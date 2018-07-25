import z from 'zero-fill'
import stats from 'stats-lite'
import math from 'mathjs'
import { ema } from '@plugins'
import { phenotypes } from '@util'

export default {
  name: 'stddev',
  description: 'Buy when standard deviation and mean increase, sell on mean decrease.',
  getOptions() {
    this.option(
      'period',
      'period length, set poll trades to 100ms, poll order 1000ms. Same as --period_length',
      String,
      '100ms'
    )
    this.option(
      'period_length',
      'period length, set poll trades to 100ms, poll order 1000ms. Same as --period',
      String,
      '100ms'
    )
    this.option('trendtrades_1', 'Trades for array 1 to be subtracted stddev and mean from', Number, 5)
    this.option('trendtrades_2', 'Trades for array 2 to be calculated stddev and mean from', Number, 53)
    this.option('min_periods', 'min_periods', Number, 1250)
  },
  calculate() {},
  onPeriod(s, cb) {
    ema(s, 'stddev', s.options.stddev)
    const tl0 = []
    const tl1 = []
    if (s.lookback[s.options.min_periods]) {
      for (let i = 0; i < s.options.trendtrades_1; i++) {
        tl0.push(s.lookback[i].close)
      }
      for (let i = 0; i < s.options.trendtrades_2; i++) {
        tl1.push(s.lookback[i].close)
      }
      s.std0 = stats.stdev(tl0) / 2
      s.std1 = stats.stdev(tl1) / 2
      s.mean0 = math.mean(tl0)
      s.mean1 = math.mean(tl1)
      s.sig0 = s.std0 > s.std1 ? 'Up' : 'Down'
      s.sig1 = s.mean0 > s.mean1 ? 'Up' : 'Down'
    }
    if (s.sig1 === 'Down') {
      s.signal = 'sell'
    } else if (s.sig0 === 'Up' && s.sig1 === 'Up') {
      s.signal = 'buy'
    }
    cb()
  },
  onReport(s) {
    const cols = []
    // @ts-ignore
    cols.push(z(s.signal, ' ', null)[s.signal === false ? 'red' : 'green'])
    return cols
  },

  phenotypes: {
    // -- common
    // reference in extensions is given in ms have not heard of an exchange that supports 500ms thru api so setting min at 1 second
    period_length: phenotypes.rangePeriod(1, 7200, 's'),
    min_periods: phenotypes.range0(1, 2500),
    markdown_buy_pct: phenotypes.rangeFloat(-1, 5),
    markup_sell_pct: phenotypes.rangeFloat(-1, 5),
    order_type: phenotypes.listOption(['maker', 'taker']),
    sell_stop_pct: phenotypes.range1(1, 50),
    buy_stop_pct: phenotypes.range1(1, 50),
    profit_stop_enable_pct: phenotypes.range1(1, 20),
    profit_stop_pct: phenotypes.range0(1, 20),

    // -- strategy
    trendtrades_1: phenotypes.range0(2, 20),
    trendtrades_2: phenotypes.range0(4, 100),
  },
}

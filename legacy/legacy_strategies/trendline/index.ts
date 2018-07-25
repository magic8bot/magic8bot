import math from 'mathjs'
import trend from 'trend'
import z from 'zero-fill'
import n from 'numbro'
import stats from 'stats-lite'
import { ema } from '@plugins'
import { phenotypes } from '@util'

let oldgrowth = 1

export default {
  name: 'trendline',
  description: 'Calculate a trendline and trade when trend is positive vs negative.',

  getOptions() {
    this.option('period', 'period length', String, '30s')
    this.option('periodLength', 'period length', String, '30s')
    this.option('lastpoints', 'Number of trades for short trend average', Number, 100)
    this.option('avgpoints', 'Number of trades for long trend average', Number, 1000)
    this.option('lastpoints2', 'Number of trades for short trend average', Number, 10)
    this.option('avgpoints2', 'Number of trades for long trend average', Number, 100)
    this.option(
      'min_periods',
      'Basically avgpoints + a BUNCH of more preroll periods for anything less than 5s period',
      Number,
      15000
    )
    this.option('markup_sell_pct', 'test', Number, 0)
    this.option('markdown_buy_pct', 'test', Number, 0)
  },

  calculate() {},

  onPeriod(s, cb) {
    ema(s, 'trendline', s.options.trendline)
    const tl1 = []
    const tls = []
    const tll = []
    if (s.lookback[s.options.avgpoints + 2000]) {
      for (let i = 0; i < s.options.avgpoints + 1000; i++) {
        tl1.push(s.lookback[i].close)
      }
      for (let i = 0; i < s.options.lastpoints; i++) {
        tls.push(s.lookback[i].close)
      }
      for (let i = 0; i < s.options.avgpoints; i++) {
        tll.push(s.lookback[i].close)
      }

      const chart = tl1

      const growth = trend(chart, {
        lastPoints: s.options.lastpoints,
        avgPoints: s.options.avgpoints,
        avgMinimum: 0,
        reversed: true,
      })
      const growth2 = trend(chart, {
        lastPoints: s.options.lastpoints2,
        avgPoints: s.options.avgpoints2,
        avgMinimum: 0,
        reversed: true,
      })

      s.stats = growth
      s.growth = growth > 1
      s.stats2 = growth2
      s.growth2 = growth2 > 1
      s.stdevs = stats.stdev(tls)
      s.stdevl = stats.stdev(tll)
      s.means = math.mean(tls)
      s.meanl = math.mean(tll)
      s.pcts = s.stdevs / s.means
      s.pctl = s.stdevl / s.meanl
      s.options.markup_sell_pct = math.mean(s.pcts, s.pctl) * 100
      s.options.markdown_buy_pct = math.mean(s.pcts, s.pctl) * 100
      s.accel = growth > oldgrowth
      oldgrowth = growth
    }

    if (s.growth === true && s.growth2 === true) {
      s.signal = 'buy'
    } else if (s.growth === false || s.growth2 === false || s.accel === false) {
      // s.signal = 'sell'
    }
    cb()
  },
  onReport(s) {
    const cols = []
    cols.push(' ')
    cols.push(z(8, n(s.stats).format('0.00000000'), ' ')[s.growth === true ? 'green' : 'red'])
    cols.push(' ')
    cols.push(z(8, n(s.stats2).format('0.00000000'), ' ')[s.growth2 === true ? 'green' : 'red'])
    cols.push(' ')
    cols.push(z(8, n(s.stdevs).format('0.00000000'), ' ')[s.accel === true ? 'green' : 'red'])
    cols.push(' ')
    cols.push(z(8, n(s.stdevl).format('0.00000000'), ' ')[s.accel === true ? 'green' : 'red'])
    cols.push(' ')
    cols.push(z(8, n(s.means).format('0.00000000'), ' ')[s.accel === true ? 'green' : 'red'])
    cols.push(' ')
    cols.push(z(8, n(s.meanl).format('0.00000000'), ' ')[s.accel === true ? 'green' : 'red'])
    cols.push(' ')
    cols.push(z(8, n(s.options.markup_sell_pct).format('0.00000000'), ' ')[s.accel === true ? 'green' : 'red'])
    return cols
  },

  phenotypes: {
    // -- common
    period_length: phenotypes.rangePeriod(1, 400, 'm'),
    min_periods: phenotypes.range0(1, 200),
    markdown_buy_pct: phenotypes.rangeFloat(-1, 5),
    markup_sell_pct: phenotypes.rangeFloat(-1, 5),
    order_type: phenotypes.listOption(['maker', 'taker']),
    sell_stop_pct: phenotypes.range1(1, 50),
    buy_stop_pct: phenotypes.range1(1, 50),
    profit_stop_enable_pct: phenotypes.range1(1, 20),
    profit_stop_pct: phenotypes.range0(1, 20),

    // -- strategy
    lastpoints: phenotypes.range0(20, 500),
    avgpoints: phenotypes.range0(300, 3000),
    lastpoints2: phenotypes.range0(5, 300),
    avgpoints2: phenotypes.range0(50, 1000),
  },
}

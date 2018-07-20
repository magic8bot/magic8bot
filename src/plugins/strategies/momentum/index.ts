import z from 'zero-fill'
import n from 'numbro'
import { momentum } from '@plugins'
import { phenotypes } from '@util'

export default {
  name: 'momentum',
  description: 'MOM = Close(Period) - Close(Length)',

  getOptions() {
    this.option('momentum_size', 'number of periods to look back for momentum', Number, 5)
  },

  calculate(s) {
    if (s.in_preroll) {
      return
    }
    momentum(s, 'mom0', 'close', s.options.momentum_size)
    momentum(s, 'mom1', 'mom0', 1)
  },

  onPeriod(s, cb) {
    if (s.in_preroll) {
      cb()
      return
    }

    if (s.period.mom0 > 0 && s.period.mom1 > 0) {
      s.signal = 'buy'
    }
    if (s.period.mom0 < 0 && s.period.mom1 < 0) {
      s.signal = 'sell'
    }
    cb()
  },

  onReport(s) {
    let cols = [],
      color
    if (s.period.mom0 != undefined) {
      color = s.period.mom0 < 0 ? 'red' : s.period.mom0 > 0 ? 'green' : 'grey'
      cols.push(z(5, n(s.period.mom0).format('000'), ' ')[color])
    } else {
      cols.push(' '.repeat(5))
    }
    if (s.period.mom1 != undefined) {
      color = s.period.mom1 < 0 ? 'red' : s.period.mom1 > 0 ? 'green' : 'grey'
      cols.push(z(5, n(s.period.mom1).format('000'), ' ')[color])
    } else {
      cols.push(' '.repeat(5))
    }
    return cols
  },

  phenotypes: {
    // -- common
    period_length: phenotypes.rangePeriod(1, 120, 'm'),
    min_periods: phenotypes.range0(1, 2500),
    markdown_buy_pct: phenotypes.rangeFloat(-1, 5),
    markup_sell_pct: phenotypes.rangeFloat(-1, 5),
    order_type: phenotypes.listOption(['maker', 'taker']),
    sell_stop_pct: phenotypes.range1(1, 50),
    buy_stop_pct: phenotypes.range1(1, 50),
    profit_stop_enable_pct: phenotypes.range1(1, 20),
    profit_stop_pct: phenotypes.range0(1, 20),

    // -- strategy
    momentum_size: phenotypes.range0(1, 20),
  },
}

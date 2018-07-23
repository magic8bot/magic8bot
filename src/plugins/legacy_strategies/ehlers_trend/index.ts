import z from 'zero-fill'
import n from 'numbro'
import { phenotypes } from '@util'
import { crossover, crossunder, nz } from '../../../util/helpers'
import * as tv from '../../../util/helpers'

export default {
  name: 'Ehlers_Trend',
  description: 'Ehlers Instantaneous Trend',

  getOptions() {
    this.option('period', 'period length, same as --period_length', String, '30m')
    this.option('period_length', 'period length, same as --period', String, '30m')

    this.option('alpha', '', Number, 0.07)
    this.option('price_source', '', String, 'HAohlc4')
  },

  calculate() {},

  onPeriod(s, cb) {
    if (s.lookback.length > s.options.min_periods) {
      if (!s.options.price_source || s.options.price_source === 'close') {
        s.period.src = s.period.close
      } else if (s.options.price_source === 'hl2') {
        s.period.src = tv.hl2(s)
      } else if (s.options.price_source === 'hlc3') {
        s.period.src = tv.hlc3(s)
      } else if (s.options.price_source === 'ohlc4') {
        s.period.src = tv.ohlc4(s)
      } else if (s.options.price_source === 'HAhlc3') {
        s.period.src = tv.hAhlc3(s)
      } else if (s.options.price_source === 'HAohlc4') {
        s.period.src = tv.hAohlc4(s)
      }

      const a = s.options.alpha
      if (s.lookback.length < 7) {
        s.period.trend = (s.period.src + 2 * nz(s.lookback[0].src) + nz(s.lookback[1].src)) / 4
      } else {
        s.period.trend =
          (a - (a * a) / 4.0) * s.period.src +
          0.5 * a * a * nz(s.lookback[0].src) -
          (a - 0.75 * a * a) * nz(s.lookback[1].src) +
          2 * (1 - a) * nz(s.lookback[0].trend) -
          (1 - a) * (1 - a) * nz(s.lookback[1].trend)
        s.period.trigger = 2.0 * s.period.trend - nz(s.lookback[1].trend)
      }
    }

    if (crossover(s, 'trend', 'trigger')) s.signal = 'sell'
    else if (crossunder(s, 'trend', 'trigger')) s.signal = 'buy'
    else s.signal = null

    cb()
  },

  onReport(s) {
    const cols = []
    let color = 'cyan'
    if (s.period.trend > s.period.trigger) {
      color = 'red'
    } else if (s.period.trend < s.period.trigger) {
      color = 'green'
    }
    cols.push(z(10, 'Trend[' + n(s.period.trend).format('###.0') + ']', '')[color])
    cols.push(z(10, ' trigger[' + n(s.period.trigger).format('###.0') + ']', '')[color])
    return cols
  },

  phenotypes: {
    // -- common
    period_length: phenotypes.rangePeriod(15, 120, 'm'),
    markdown_buy_pct: phenotypes.rangeFloat(-1, 3),
    markup_sell_pct: phenotypes.rangeFloat(-1, 3),
    order_type: phenotypes.listOption(['maker', 'taker']),
    profit_stop_enable_pct: phenotypes.range1(1, 20),
    profit_stop_pct: phenotypes.range0(1, 20),

    // Strategy Specific
    alpha: phenotypes.rangeFactor(0.01, 0.2, 0.01),
  },
}

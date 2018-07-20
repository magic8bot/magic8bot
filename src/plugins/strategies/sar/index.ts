import z from 'zero-fill'
import n from 'numbro'
import { phenotypes } from '@util'

export default {
  name: 'sar',
  description: 'Parabolic SAR',

  getOptions() {
    this.option('period', 'period length, same as --period_length', String, '2m')
    this.option('period_length', 'period length, same as --period', String, '2m')
    this.option('min_periods', 'min. number of history periods', Number, 52)
    this.option('sar_af', 'acceleration factor for parabolic SAR', Number, 0.015)
    this.option('sar_max_af', 'max acceleration factor for parabolic SAR', Number, 0.3)
  },

  calculate(s) {
    if (s.lookback.length >= s.options.min_periods) {
      if (!s.trend) {
        if (s.period.high > s.lookback[s.lookback.length - 1].high) {
          // start with uptrend
          s.trend = 'up'
          s.sar = Math.min(s.lookback[1].low, s.lookback[0].low)
          s.sar_ep = s.period.high
          s.sar_af = s.options.sar_af
          for (let idx = 0; idx < s.lookback.length; idx++) {
            s.sar_ep = Math.max(s.sar_ep, s.lookback[idx].high)
          }
        } else {
          s.trend = 'down'
          s.sar = Math.max(s.lookback[1].high, s.lookback[0].high)
          s.sar_ep = s.period.low
          s.sar_af = s.options.sar_af
          for (let idx = 0; idx < s.lookback.length; idx++) {
            s.sar_ep = Math.min(s.sar_ep, s.lookback[idx].low)
          }
        }
      }
    }
  },

  onPeriod(s, cb) {
    if (typeof s.sar === 'number') {
      if (s.trend === 'up') {
        s.sar = Math.min(s.lookback[1].low, s.lookback[0].low, s.sar + s.sar_af * (s.sar_ep - s.sar))
      } else {
        s.sar = Math.max(s.lookback[1].high, s.lookback[0].high, s.sar - s.sar_af * (s.sar - s.sar_ep))
      }
      if (s.trend === 'down') {
        if (s.period.high >= s.sar && s.period.close > s.lookback[0].close) {
          s.trend = 'up'
          s.signal = 'buy'
          s.sar_ep = s.period.low
          s.sar_af = s.options.sar_af
          s.sar = Math.min(s.lookback[0].low, s.period.low, s.sar + s.sar_af * (s.sar_ep - s.sar))
        } else if (s.period.low < s.sar_ep) {
          s.sar_ep = s.period.low
          if (s.sar_af < s.options.sar_max_af) {
            s.sar_af += s.options.sar_af
          }
        }
      } else if (s.trend === 'up') {
        if (s.period.low <= s.sar && s.period.close < s.lookback[0].close) {
          s.trend = 'down'
          s.signal = 'sell'
          s.sar_ep = s.period.high
          s.sar_af = s.options.sar_af
          s.sar = Math.max(s.lookback[0].high, s.period.high, s.sar - s.sar_af * (s.sar - s.sar_ep))
        } else if (s.period.high > s.sar_ep) {
          s.sar_ep = s.period.high
          if (s.sar_af < s.options.sar_max_af) {
            s.sar_af += s.options.sar_af
          }
        }
      }
      if (!s.my_trades.length) {
        s.signal = s.trend === 'up' ? 'buy' : 'sell'
      }
    }
    cb()
  },

  onReport(s) {
    const cols = []
    if (typeof s.sar === 'number') {
      cols.push(
        z(
          8,
          n(s.sar)
            .subtract(s.period.close)
            .divide(s.period.close)
            .format('0.00%'),
          ' '
        ).grey
      )
    }
    return cols
  },

  phenotypes: {
    // -- common
    period_length: phenotypes.rangePeriod(1, 120, 'm'),
    min_periods: phenotypes.range0(2, 100),
    markdown_buy_pct: phenotypes.rangeFloat(-1, 5),
    markup_sell_pct: phenotypes.rangeFloat(-1, 5),
    order_type: phenotypes.listOption(['maker', 'taker']),
    sell_stop_pct: phenotypes.range1(1, 50),
    buy_stop_pct: phenotypes.range1(1, 50),
    profit_stop_enable_pct: phenotypes.range1(1, 20),
    profit_stop_pct: phenotypes.range0(1, 20),

    // -- strategy
    sar_af: phenotypes.rangeFloat(0.01, 1.0),
    sar_max_af: phenotypes.rangeFloat(0.01, 1.0),
  },
}

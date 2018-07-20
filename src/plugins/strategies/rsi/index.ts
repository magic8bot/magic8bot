import z from 'zero-fill'
import n from 'numbro'
import { rsi } from '@plugins'
import { phenotypes } from '@util'

export default {
  name: 'rsi',
  description: 'Attempts to buy low and sell high by tracking RSI high-water readings.',

  getOptions() {
    this.option('period', 'period length, same as --period_length', String, '2m')
    this.option('period_length', 'period length, same as --period', String, '2m')
    this.option('min_periods', 'min. number of history periods', Number, 52)
    this.option('rsi_periods', 'number of RSI periods', 14)
    this.option('oversold_rsi', 'buy when RSI reaches or drops below this value', Number, 30)
    this.option('overbought_rsi', 'sell when RSI reaches or goes above this value', Number, 82)
    this.option('rsi_recover', 'allow RSI to recover this many points before buying', Number, 3)
    this.option('rsi_drop', 'allow RSI to fall this many points before selling', Number, 0)
    this.option('rsi_divisor', 'sell when RSI reaches high-water reading divided by this value', Number, 2)
  },

  calculate(s) {
    rsi(s, 'rsi', s.options.rsi_periods)
  },

  onPeriod(s, cb) {
    if (s.in_preroll) return cb()
    if (typeof s.period.rsi === 'number') {
      if (s.trend !== 'oversold' && s.trend !== 'long' && s.period.rsi <= s.options.oversold_rsi) {
        s.rsi_low = s.period.rsi
        s.trend = 'oversold'
      }
      if (s.trend === 'oversold') {
        s.rsi_low = Math.min(s.rsi_low, s.period.rsi)
        if (s.period.rsi >= s.rsi_low + s.options.rsi_recover) {
          s.trend = 'long'
          s.signal = 'buy'
          s.rsi_high = s.period.rsi
        }
      }
      if (s.trend === 'long') {
        s.rsi_high = Math.max(s.rsi_high, s.period.rsi)
        if (s.period.rsi <= s.rsi_high / s.options.rsi_divisor) {
          s.trend = 'short'
          s.signal = 'sell'
        }
      }
      if (s.trend === 'long' && s.period.rsi >= s.options.overbought_rsi) {
        s.rsi_high = s.period.rsi
        s.trend = 'overbought'
      }
      if (s.trend === 'overbought') {
        s.rsi_high = Math.max(s.rsi_high, s.period.rsi)
        if (s.period.rsi <= s.rsi_high - s.options.rsi_drop) {
          s.trend = 'short'
          s.signal = 'sell'
        }
      }
    }
    cb()
  },

  onReport(s) {
    const cols = []
    if (typeof s.period.rsi === 'number') {
      let color = 'grey'
      if (s.period.rsi <= s.options.oversold_rsi) {
        color = 'green'
      }
      cols.push(z(4, n(s.period.rsi).format('0'), ' ')[color])
    }
    return cols
  },

  phenotypes: {
    // -- common
    period_length: phenotypes.rangePeriod(1, 120, 'm'),
    min_periods: phenotypes.range0(1, 200),
    markdown_buy_pct: phenotypes.rangeFloat(-1, 5),
    markup_sell_pct: phenotypes.rangeFloat(-1, 5),
    order_type: phenotypes.listOption(['maker', 'taker']),
    sell_stop_pct: phenotypes.range1(1, 50),
    buy_stop_pct: phenotypes.range1(1, 50),
    profit_stop_enable_pct: phenotypes.range1(1, 20),
    profit_stop_pct: phenotypes.range0(1, 20),

    // -- strategy
    rsi_periods: phenotypes.range0(1, 200),
    oversold_rsi: phenotypes.range0(1, 100),
    overbought_rsi: phenotypes.range0(1, 100),
    rsi_recover: phenotypes.range0(1, 100),
    rsi_drop: phenotypes.range0(0, 100),
    rsi_divisor: phenotypes.range0(1, 10),
  },
}

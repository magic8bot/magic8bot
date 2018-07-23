import z from 'zero-fill'
import n from 'numbro'
import { ema, srsi, cci } from '@plugins'
import { phenotypes } from '@util'

export default {
  name: 'cci_srsi',
  description: 'Stochastic CCI Strategy',

  getOptions() {
    this.option('period', 'period length, same as --period_length', String, '20m')
    this.option('period_length', 'period length, same as --period', String, '20m')
    this.option('min_periods', 'min. number of history periods', Number, 30)
    this.option('ema_acc', 'sideways threshold (0.2-0.4)', Number, 0.03)
    this.option('cci_periods', 'number of RSI periods', Number, 14)
    this.option('rsi_periods', 'number of RSI periods', Number, 14)
    this.option('srsi_periods', 'number of RSI periods', Number, 9)
    this.option('srsi_k', '%K line', Number, 5)
    this.option('srsi_d', '%D line', Number, 3)
    this.option('oversold_rsi', 'buy when RSI reaches or drops below this value', Number, 18)
    this.option('overbought_rsi', 'sell when RSI reaches or goes above this value', Number, 85)
    this.option('oversold_cci', 'buy when CCI reaches or drops below this value', Number, -90)
    this.option('overbought_cci', 'sell when CCI reaches or goes above this value', Number, 140)
    this.option('constant', 'constant', Number, 0.015)
    console.log('If you have questions about this strategy, contact me... @talvasconcelos')
  },

  calculate(s) {
    // get market trend
    ema(s, 'trend_ema', s.options.min_periods)
    if (typeof s.period.trend_ema !== 'undefined') {
      s.trend = s.period.trend_ema > s.lookback[0].trend_ema ? 'up' : 'down'
    }

    // compute Stochastic RSI
    srsi(s, 'srsi', s.options.rsi_periods, s.options.srsi_k, s.options.srsi_d)

    // compute CCI
    cci(s, 'cci', s.options.cci_periods, s.options.constant)

    if (typeof s.period.cci !== 'undefined' && typeof s.period.srsi_K !== 'undefined') {
      s.cci_fromAbove = s.period.cci < s.lookback[0].cci
      s.rsi_fromAbove = s.period.srsi_K < s.lookback[0].srsi_K
    }

    if (s.period.trend_ema && s.lookback[0] && s.lookback[0].trend_ema) {
      s.period.acc = Math.abs(((s.period.trend_ema - s.lookback[0].trend_ema) / s.lookback[0].trend_ema) * 100)
    }
  },

  onPeriod(s, cb) {
    if (!s.in_preroll && typeof s.trend !== 'undefined') {
      // Sideways Market
      if (s.period.acc < s.options.ema_acc) {
        // Buy signal
        if (
          s.period.cci <= s.options.oversold_cci &&
          /*s.period.srsi_K > s.period.srsi_D &&*/ s.period.srsi_K <= s.options.oversold_rsi
        ) {
          if (!s.cci_fromAbove && !s.rsi_fromAbove) {
            s.signal = 'buy'
          }
        }
        // Sell signal
        if (
          s.period.cci >= s.options.overbought_cci &&
          /*s.period.srsi_K < s.period.srsi_D &&*/ s.period.srsi_K >= s.options.overbought_rsi
        ) {
          if (s.cci_fromAbove || s.rsi_fromAbove) {
            s.signal = 'sell'
          }
        }
        // cb()
      }
      // Buy signal
      if (s.trend === 'up') {
        if (
          s.period.cci <= s.options.oversold_cci &&
          /*s.period.srsi_K > s.period.srsi_D &&*/ s.period.srsi_K <= s.options.oversold_rsi
        ) {
          if (!s.cci_fromAbove && !s.rsi_fromAbove) {
            s.signal = 'buy'
          }
        }
      }
      // Sell signal
      if (s.trend === 'down') {
        if (
          s.period.cci >= s.options.overbought_cci &&
          /*s.period.srsi_K < s.period.srsi_D &&*/ s.period.srsi_K >= s.options.overbought_rsi
        ) {
          if (s.cci_fromAbove || s.rsi_fromAbove) {
            s.signal = 'sell'
          }
        }
      }
    }
    cb()
  },
  onReport(s) {
    const cols = []
    if (typeof s.period.cci === 'number') {
      let color = 'grey'
      if (s.period.cci > 0) {
        color = 'green'
      } else if (s.period.cci < 0) {
        color = 'red'
      }
      cols.push(z(8, n(s.period.cci).format('000'), ' ')[color])
      cols.push(s.period.acc > s.options.ema_acc ? z(8, n(s.period.srsi_K).format('000'), ' ')[color] : '   -->   ')
    } else {
      cols.push('         ')
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
    ema_acc: phenotypes.rangeFloat(0, 0.5),
    cci_periods: phenotypes.range0(1, 200),
    rsi_periods: phenotypes.range0(1, 200),
    srsi_periods: phenotypes.range0(1, 200),
    srsi_k: phenotypes.range0(1, 50),
    srsi_d: phenotypes.range0(1, 50),
    oversold_rsi: phenotypes.range0(1, 100),
    overbought_rsi: phenotypes.range0(1, 100),
    oversold_cci: phenotypes.range0(-100, 100),
    overbought_cci: phenotypes.range0(1, 100),
    constant: phenotypes.rangeFloat(0.001, 0.05),
  },
}

/* Made by talvasconcelos*/

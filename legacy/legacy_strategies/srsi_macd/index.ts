import z from 'zero-fill'
import n from 'numbro'
import { srsi, ema } from '@plugins'
import { phenotypes } from '@util'

export default {
  name: 'srsi_macd',
  description: 'Stochastic MACD Strategy',

  getOptions() {
    this.option('period', 'period length, same as --period_length', String, '30m')
    this.option('period_length', 'period length, same as --period', String, '30m')
    this.option('min_periods', 'min. number of history periods', Number, 200)
    this.option('rsi_periods', 'number of RSI periods', 14)
    this.option('srsi_periods', 'number of RSI periods', Number, 9)
    this.option('srsi_k', '%D line', Number, 5)
    this.option('srsi_d', '%D line', Number, 3)
    this.option('oversold_rsi', 'buy when RSI reaches or drops below this value', Number, 20)
    this.option('overbought_rsi', 'sell when RSI reaches or goes above this value', Number, 80)
    this.option('ema_short_period', 'number of periods for the shorter EMA', Number, 24)
    this.option('ema_long_period', 'number of periods for the longer EMA', Number, 200)
    this.option('signal_period', 'number of periods for the signal EMA', Number, 9)
    this.option('up_trend_threshold', 'threshold to trigger a buy signal', Number, 0)
    this.option('down_trend_threshold', 'threshold to trigger a sold signal', Number, 0)
  },

  calculate(s) {
    // compute Stochastic RSI
    srsi(s, 'srsi', s.options.rsi_periods, s.options.srsi_k, s.options.srsi_d)

    // compute MACD
    ema(s, 'ema_short', s.options.ema_short_period)
    ema(s, 'ema_long', s.options.ema_long_period)
    if (s.period.ema_short && s.period.ema_long) {
      s.period.macd = s.period.ema_short - s.period.ema_long
      ema(s, 'signal', s.options.signal_period, 'macd')
      if (s.period.signal) {
        s.period.macd_histogram = s.period.macd - s.period.signal
      }
    }
  },

  onPeriod(s, cb) {
    if (!s.in_preroll) {
      if (
        typeof s.period.macd_histogram === 'number' &&
        typeof s.lookback[0].macd_histogram === 'number' &&
        typeof s.period.srsi_K === 'number' &&
        typeof s.period.srsi_D === 'number'
      ) {
        if (s.period.macd_histogram >= s.options.up_trend_threshold) {
          if (
            s.period.srsi_K > s.period.srsi_D &&
            s.period.srsi_K > s.lookback[0].srsi_K &&
            s.period.srsi_K < s.options.oversold_rsi
          ) {
            // Buy signal
            s.signal = 'buy'
          }
        }
      }
    }

    // Sell signal
    if (s.period.macd_histogram < s.options.down_trend_threshold) {
      if (
        s.period.srsi_K < s.period.srsi_D &&
        s.period.srsi_K < s.lookback[0].srsi_K &&
        s.period.srsi_K > s.options.overbought_rsi
      ) {
        s.signal = 'sell'
      }
    }

    // Hold
    // s.signal = null;
    cb()
  },
  onReport(s) {
    const cols = []
    if (typeof s.period.macd_histogram === 'number') {
      let color = 'grey'
      if (s.period.macd_histogram > 0) {
        color = 'green'
      } else if (s.period.macd_histogram < 0) {
        color = 'red'
      }
      cols.push(z(8, n(s.period.macd_histogram).format('+00.0000'), ' ')[color])
      cols.push(z(8, n(s.period.srsi_K).format('00.00'), ' ').cyan)
      cols.push(z(8, n(s.period.srsi_D).format('00.00'), ' ').yellow)
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
    rsi_periods: phenotypes.range0(1, 200),
    srsi_periods: phenotypes.range0(1, 200),
    srsi_k: phenotypes.range0(1, 50),
    srsi_d: phenotypes.range0(1, 50),
    oversold_rsi: phenotypes.range0(1, 100),
    overbought_rsi: phenotypes.range0(1, 100),
    ema_short_period: phenotypes.range0(1, 20),
    ema_long_period: phenotypes.range0(20, 100),
    signal_period: phenotypes.range0(1, 20),
    up_trend_threshold: phenotypes.range0(0, 20),
    down_trend_threshold: phenotypes.range0(0, 20),
  },
}

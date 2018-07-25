import z from 'zero-fill'
import n from 'numbro'
import { rsi, taMacdExt } from '@plugins'
import { phenotypes } from '@util'

export default {
  name: 'ta_macd_ext',
  description: 'Buy when (MACD - Signal > 0) and sell when (MACD - Signal < 0) with controllable talib TA types',

  getOptions() {
    this.option('period', 'period length, same as --period_length', String, '1h')
    this.option('min_periods', 'min. number of history periods', Number, 52)
    this.option('ema_short_period', 'number of periods for the shorter EMA', Number, 12)
    this.option('ema_long_period', 'number of periods for the longer EMA', Number, 26)
    this.option('signal_period', 'number of periods for the signal EMA', Number, 9)
    this.option('fast_ma_type', 'fast_ma_type of talib: SMA, EMA, WMA, DEMA, TEMA, TRIMA, KAMA, MAMA, T3', String, null)
    this.option('slow_ma_type', 'slow_ma_type of talib: SMA, EMA, WMA, DEMA, TEMA, TRIMA, KAMA, MAMA, T3', String, null)
    this.option(
      'signal_ma_type',
      'signal_ma_type of talib: SMA, EMA, WMA, DEMA, TEMA, TRIMA, KAMA, MAMA, T3',
      String,
      null
    )
    this.option(
      'default_ma_type',
      'set default ma_type for fast, slow and signal. You are able to overwrite single types separately (fast_ma_type, slow_ma_type, signal_ma_type)',
      String,
      'SMA'
    )
    this.option('up_trend_threshold', 'threshold to trigger a buy signal', Number, 0)
    this.option('down_trend_threshold', 'threshold to trigger a sold signal', Number, 0)
    this.option('overbought_rsi_periods', 'number of periods for overbought RSI', Number, 25)
    this.option('overbought_rsi', 'sold when RSI exceeds this value', Number, 70)
  },

  calculate(s) {
    if (s.options.overbought_rsi) {
      // sync RSI display with overbought RSI periods
      s.options.rsi_periods = s.options.overbought_rsi_periods
      rsi(s, 'overbought_rsi', s.options.overbought_rsi_periods)
      if (!s.in_preroll && s.period.overbought_rsi >= s.options.overbought_rsi && !s.overbought) {
        s.overbought = true
        if (s.options.mode === 'sim' && s.options.verbose) {
          console.log(('\noverbought at ' + s.period.overbought_rsi + ' RSI, preparing to sold\n').cyan)
        }
      }
    }
  },

  onPeriod(s, cb) {
    if (!s.in_preroll && typeof s.period.overbought_rsi === 'number') {
      if (s.overbought) {
        s.overbought = false
        s.signal = 'sell'
        return cb()
      }
    }

    const types = {
      fast_ma_type: s.options.default_ma_type || 'SMA',
      slow_ma_type: s.options.default_ma_type || 'SMA',
      signal_ma_type: s.options.default_ma_type || 'SMA',
    }

    if (s.options.fast_ma_type) {
      types.fast_ma_type = s.options.fast_ma_type
    }

    if (s.options.slow_ma_type) {
      types.slow_ma_type = s.options.slow_ma_type
    }

    if (s.options.signal_ma_type) {
      types.signal_ma_type = s.options.signal_ma_type
    }

    taMacdExt(
      s,
      s.options.ema_long_period,
      s.options.ema_short_period,
      s.options.signal_period,
      types.fast_ma_type,
      types.slow_ma_type,
      types.signal_ma_type
    )
      .then(function(signal: Record<string, any>) {
        if (!signal) {
          cb()
          return
        }

        s.period.macd = signal.macd
        s.period.macd_histogram = signal.macd_histogram
        s.period.macd_signal = signal.macd_signal

        if (typeof s.period.macd_histogram === 'number' && typeof s.lookback[0].macd_histogram === 'number') {
          if (
            s.period.macd_histogram - s.options.up_trend_threshold > 0 &&
            s.lookback[0].macd_histogram - s.options.up_trend_threshold <= 0
          ) {
            s.signal = 'buy'
          } else if (
            s.period.macd_histogram + s.options.down_trend_threshold < 0 &&
            s.lookback[0].macd_histogram + s.options.down_trend_threshold >= 0
          ) {
            s.signal = 'sell'
          } else {
            s.signal = null // hold
          }
        }

        cb()
      })
      .catch(function(error) {
        console.log(error)
        cb()
      })
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
      cols.push(z(8, n(s.period.overbought_rsi).format('00'), ' ').cyan)
    } else {
      cols.push('         ')
    }
    return cols
  },

  phenotypes: {
    period_length: phenotypes.rangePeriod(1, 120, 'm'),
    min_periods: phenotypes.range0(1, 104),
    markdown_buy_pct: phenotypes.rangeFloat(-1, 5),
    markup_sell_pct: phenotypes.rangeFloat(-1, 5),
    order_type: phenotypes.listOption(['maker', 'taker']),
    sell_stop_pct: phenotypes.range1(1, 50),
    buy_stop_pct: phenotypes.range1(1, 50),
    profit_stop_enable_pct: phenotypes.range1(1, 20),
    profit_stop_pct: phenotypes.range0(1, 20),

    // have to be minimum 2 because talib will throw an "TA_BAD_PARAM" error
    ema_short_period: phenotypes.range0(2, 20),
    ema_long_period: phenotypes.range0(20, 100),
    signal_period: phenotypes.range0(1, 20),
    fast_ma_type: phenotypes.rangeMaType(),
    slow_ma_type: phenotypes.rangeMaType(),
    signal_ma_type: phenotypes.rangeMaType(),
    default_ma_type: phenotypes.rangeMaType(),
    //    this.option('default_ma_type', 'set default ma_type for fast, slow and signal. You are able to overwrite single types separately (fast_ma_type, slow_ma_type, signal_ma_type)', String, 'SMA')
    up_trend_threshold: phenotypes.range0(0, 50),
    down_trend_threshold: phenotypes.range0(0, 50),
    overbought_rsi_periods: phenotypes.range0(1, 50),
    overbought_rsi: phenotypes.range0(20, 100),
  },
}

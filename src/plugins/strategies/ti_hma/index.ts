import z from 'zero-fill'
import n from 'numbro'
import { rsi, tiHma } from '@plugins'
import { phenotypes } from '@util'

export default {
  name: 'ti_hma',
  description: 'HMA - Hull Moving Average',

  getOptions() {
    this.option('period', 'period length eg 10m', String, '15m')
    this.option('min_periods', 'min. number of history periods', Number, 52)
    this.option('trend_hma', 'number of periods for trend hma', Number, 36)
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

    tiHma(s, s.options.min_periods, s.options.trend_hma)
      .then(function(signal) {
        s.period.trend_hma = signal

        // percentage change
        if (s.period.trend_hma && s.lookback[0] && s.lookback[0].trend_hma) {
          s.period.trend_hma_rate = ((s.period.trend_hma - s.lookback[0].trend_hma) / s.lookback[0].trend_hma) * 100
        }

        if (s.period.trend_hma_rate > 0) {
          if (s.trend !== 'up') {
            s.acted_on_trend = false
          }
          s.trend = 'up'
          s.signal = !s.acted_on_trend ? 'buy' : null
          s.cancel_down = false
        } else if (!s.cancel_down && s.period.trend_hma_rate < 0) {
          if (s.trend !== 'down') {
            s.acted_on_trend = false
          }
          s.trend = 'down'
          s.signal = !s.acted_on_trend ? 'sell' : null
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

    if (typeof s.period.trend_hma === 'number') {
      let color = 'grey'

      if (s.period.trend_hma_rate > 0) {
        color = 'green'
      } else if (s.period.trend_hma_rate < 0) {
        color = 'red'
      }

      cols.push(z(8, n(s.period.trend_hma).format('0.0000'), ' ')[color])
      cols.push(z(6, n(s.period.trend_hma_rate).format('0.00'), ' ')[color])
    }

    return cols
  },

  phenotypes: {
    period_length: phenotypes.rangePeriod(5, 120, 'm'),
    min_periods: phenotypes.range0(20, 104),
    markdown_buy_pct: phenotypes.rangeFloat(-1, 5),
    markup_sell_pct: phenotypes.rangeFloat(-1, 5),
    order_type: phenotypes.listOption(['maker', 'taker']),
    sell_stop_pct: phenotypes.range1(1, 50),
    buy_stop_pct: phenotypes.range1(1, 50),
    profit_stop_enable_pct: phenotypes.range1(1, 20),
    profit_stop_pct: phenotypes.range0(1, 20),

    trend_hma: phenotypes.range0(6, 72),
    overbought_rsi_periods: phenotypes.range0(1, 50),
    overbought_rsi: phenotypes.range0(20, 100),
  },
}

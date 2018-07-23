import z from 'zero-fill'
import n from 'numbro'
import { wto, ema } from '@plugins'
import { phenotypes } from '@util'

export default {
  name: 'wavetrend',
  description: 'Buy when (Signal < Oversold) and sell when (Signal > Overbought).',

  getOptions() {
    this.option('period', 'period length, same as --period_length', String, '1h')
    this.option('period_length', 'period length, same as --period', String, '1h')
    this.option('min_periods', 'min. number of history periods', Number, 21)
    this.option('wavetrend_channel_length', 'wavetrend channel length', Number, 10)
    this.option('wavetrend_average_length', 'wavetrend average length', Number, 21)
    this.option('wavetrend_overbought_1', 'wavetrend overbought limit 1', Number, 60)
    this.option('wavetrend_overbought_2', 'wavetrend overbought limit 2', Number, 53)
    this.option('wavetrend_oversold_1', 'wavetrend oversold limit 1', Number, -60)
    this.option('wavetrend_oversold_2', 'wavetrend oversold limit 2', Number, -53)
    this.option('wavetrend_trends', 'act on trends instead of limits', Boolean, false)
  },

  calculate(s) {
    // calculate Wavetrend and EMA
    wto(s, 'wto', s.options.wavetrend_channel_length)
    ema(s, 'ema', s.options.wavetrend_channel_length)
  },

  onPeriod(s, cb) {
    if (s.period.wto) {
      s.signal = null // hold
      const prev_wto = s.lookback[0].wto
      const wto = s.period.wto
      const prev_hcl3 = s.lookback[0].hcl3
      const hcl3 = s.period.hcl3
      const prev_ema = s.lookback[0].ema
      const ema = s.period.ema

      if (!s.sell_signal_close) s.sell_signal_close = 0
      if (!s.buy_signal_close) s.buy_signal_close = 0
      if (!s.sell_pct_orig) s.sell_pct_orig = s.sell_pct
      if (!s.buy_pct_orig) s.buy_pct_orig = s.sell_pct

      s.options.wavetrend_trends = s.options.wavetrend_trends === 'true' || s.options.wavetrend_trends === true

      if (s.options.wavetrend_trends === true) {
        if (wto > prev_wto) {
          if (s.trend === 'down' && s.buy_signal_close < s.period.close) {
            // console.log('\n')
            // console.log(s.period.hcl3, s.period.wto, s.lookback[0].wto, s.buy_signal_close)
            // console.log('trend reversal, we should sell')
            s.signal = 'sell'
            s.sell_signal_close = s.period.close
          }
          s.trend = 'up'
        }
        if (wto < prev_wto) {
          if (s.trend === 'up' && s.sell_signal_close > s.period.close) {
            // console.log('\n')
            // console.log(s.period.hcl3, s.period.wto, s.lookback[0].wto, s.sell_signal_close)
            // console.log('trend reversal, we should buy')
            s.signal = 'buy'
            s.buy_signal_close = s.period.close
          }
          s.trend = 'down'
        }
      }
      if (s.options.wavetrend_trends === false) {
        if (wto < s.options.wavetrend_overbought_2 && prev_wto < s.options.wavetrend_overbought_2) {
          s.sell_pct = 99
          // console.log('\n')
          // console.log(prev_wto, wto, prev_hcl3, hcl3, prev_ema, ema)
          // console.log('trend reversal, we should sell')
          if (prev_wto > wto && prev_hcl3 > hcl3 && prev_ema > ema) {
            if (s.trend === 'down' && s.buy_signal_close < s.period.close) {
              s.signal = 'sell'
              s.sell_signal_close = s.period.close
            }
            s.trend = 'up'
          }
        } else if (wto > s.options.wavetrend_oversold_2 && prev_wto > s.options.wavetrend_oversold_2) {
          s.buy_pct = 99
          // console.log('\n')
          // console.log(prev_wto, wto, prev_hcl3, hcl3, prev_ema, ema)
          // console.log('trend reversal, we should buy')
          if (prev_wto < wto && prev_hcl3 < hcl3 && prev_ema < ema) {
            if (s.trend === 'up' && s.sell_signal_close > s.period.close) {
              s.signal = 'buy'
              s.buy_signal_close = s.period.close
            }
            s.trend = 'down'
          }
        } else if (wto < s.options.wavetrend_overbought_1 && prev_wto < s.options.wavetrend_overbought_1) {
          s.sell_pct = 5
          // console.log('\n')
          // console.log(prev_wto, wto, prev_hcl3, hcl3, prev_ema, ema)
          // console.log('trend reversal, we should sell')
          if (prev_wto > wto && prev_hcl3 > hcl3 && prev_ema > ema) {
            if (s.trend === 'down' && s.buy_signal_close < s.period.close) {
              s.signal = 'sell'
              s.sell_signal_close = s.period.close
            }
            s.trend = 'up'
          }
        } else if (wto > s.options.wavetrend_oversold_1 && prev_wto > s.options.wavetrend_oversold_1) {
          s.buy_pct = 5
          // console.log('\n')
          // console.log(prev_wto, wto, prev_hcl3, hcl3, prev_ema, ema)
          // console.log('trend reversal, we should buy')
          if (prev_wto < wto && prev_hcl3 < hcl3 && prev_ema < ema) {
            if (s.trend === 'up' && s.sell_signal_close > s.period.close) {
              s.signal = 'buy'
              s.buy_signal_close = s.period.close
            }
            s.trend = 'down'
          }
        } else {
          s.sell_pct = 1
          s.buy_pct = 1
          if (wto > prev_wto) {
            if (s.trend === 'down' && s.buy_signal_close < s.period.close) {
              // console.log('\n')
              // console.log(s.period.hcl3, s.period.wto, s.lookback[0].wto, s.buy_signal_close)
              // console.log('trend reversal, we should sell')
              s.signal = 'sell'
              s.sell_signal_close = s.period.close
            }
            s.trend = 'up'
          }
          if (wto < prev_wto) {
            if (s.trend === 'up' && s.sell_signal_close > s.period.close) {
              // console.log('\n')
              // console.log(s.period.hcl3, s.period.wto, s.lookback[0].wto, s.sell_signal_close)
              // console.log('trend reversal, we should buy')
              s.signal = 'buy'
              s.buy_signal_close = s.period.close
            }
            s.trend = 'down'
          }
        }
      }
    }
    cb()
  },

  onReport(s) {
    const cols = []
    if (s.period.wto) {
      let color = 'grey'
      if (s.period.hcl3 > s.lookback[0].hcl3) {
        color = 'green'
      } else if (s.period.hcl3 < s.lookback[0].hcl3) {
        color = 'red'
      }
      cols.push(z(8, n(s.period.hcl3).format('+00.0000'), ' ')[color])
      cols.push(z(8, n(s.period.wto).format('00'), ' ').cyan)
      cols.push(z(8, n(s.lookback[0].wto).format('00'), ' ').cyan)
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
    wavetrend_channel_length: phenotypes.range0(1, 20),
    wavetrend_average_length: phenotypes.range0(1, 42),
    wavetrend_overbought_1: phenotypes.range0(1, 100),
    wavetrend_overbought_2: phenotypes.range0(1, 100),
    wavetrend_oversold_1: phenotypes.range0(-100, 0),
    wavetrend_oversold_2: phenotypes.range0(-100, 0),
    wavetrend_trends: phenotypes.listOption([true, false]),
  },
}

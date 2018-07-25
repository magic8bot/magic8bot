import z from 'zero-fill'
import n from 'numbro'
import { vwap, ema, sma } from '@plugins'
import { phenotypes } from '@util'

export default {
  name: 'crossover_vwap',
  description: 'Estimate trends by comparing "Volume Weighted Average Price" to the "Exponential Moving Average".',

  getOptions() {
    // default start is 30, 108, 60.
    // these are relative to period length.

    /*
        Positive simulations during testing:

        magic8bot sim kraken.XXRP-ZEUR --period="120m" --strategy=crossover_vwap --currency_capital=700 --asset_capital=0 --max_slippage_pct=100 --days=60 --avg_slippage_pct=0.045 --vwap_max=8000 --markup_sell_pct=0.5 --markdown_buy_pct=0.5 --emalen1=50
        magic8bot sim kraken.XXRP-ZEUR --period="120m" --strategy=crossover_vwap --currency_capital=700 --asset_capital=0 --max_slippage_pct=100 --days=60 --avg_slippage_pct=0.045 --vwap_max=8000 --markup_sell_pct=0.5 --markdown_buy_pct=0.5 --emalen1=30
      */
    this.option('period', 'period length, same as --period_length', String, '120m')
    this.option('period_length', 'period length, same as --period', String, '120m')
    this.option('emalen1', 'Length of EMA 1', Number, 30) // green
    this.option('smalen1', 'Length of SMA 1', Number, 108) // red
    this.option('smalen2', 'Length of SMA 2', Number, 60) // purple
    this.option('vwap_length', 'Min periods for vwap to start', Number, 10) // gold
    this.option(
      'vwap_max',
      'Max history for vwap. Increasing this makes it more sensitive to short-term changes',
      Number,
      8000
    ) // gold
  },

  calculate() {},

  onPeriod(s, cb) {
    vwap(s, 'vwap', s.options.vwap_length, s.options.vwap_max) // gold

    ema(s, 'ema1', s.options.emalen1) // green
    sma(s, 'sma1', s.options.smalen1, 'high') // red
    sma(s, 'sma2', s.options.smalen2) // purple
    const emagreen = s.period.ema1,
      smared = s.period.sma1,
      smapurple = s.period.sma2,
      vwapgold = s.period.vwap

    // helper functions
    const trendUp = function(s) {
        if (s.trend !== 'up') {
          s.acted_on_trend = false
        }
        s.trend = 'up'
        s.signal = !s.acted_on_trend ? 'buy' : null
      },
      trendDown = function(s) {
        if (s.trend !== 'down') {
          s.acted_on_trend = false
        }
        s.trend = 'down'
        s.signal = !s.acted_on_trend ? 'sell' : null
      }

    if (emagreen && smared && smapurple && s.period.vwap) {
      if (vwapgold > emagreen) trendUp(s)
      else trendDown(s)
    }
    cb()
  },

  onReport(s) {
    const cols = []
    const emagreen = s.period.ema1,
      vwapgold = s.period.vwap

    if (vwapgold && emagreen) {
      let color = 'green'
      if (vwapgold > emagreen) color = 'red'

      cols.push(z(6, n(vwapgold).format('0.00000'), '').yellow + ' ')
      cols.push(z(6, n(emagreen).format('0.00000'), '')[color] + ' ')
    } else {
      cols.push('                ')
    }
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
    emalen1: phenotypes.range0(1, 300),
    smalen1: phenotypes.range0(1, 300),
    smalen2: phenotypes.range0(1, 300),
    vwap_length: phenotypes.range0(1, 300),
    vwap_max: phenotypes.rangeFactor(0, 10000, 10), // 0 disables this max cap. Test in increments of 10
  },
}

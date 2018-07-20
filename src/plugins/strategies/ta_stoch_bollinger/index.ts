import z from 'zero-fill'
import n from 'numbro'
import { taStoch, taBollinger } from '@plugins'
import { phenotypes } from '@util'

export default {
  name: 'ta_stoch_bollinger',
  description: 'Stochastic BollingerBand Strategy',

  getOptions() {
    this.option('period', 'period length, same as --period_length', String, '5m')
    this.option('period_length', 'period length, same as --period', String, '5m')
    this.option('min_periods', 'min. number of history periods', Number, 200)
    this.option('rsi_periods', 'Time period for building the Fast-K line', Number, 14)
    this.option('stoch_periods', 'Time period for building the Fast-K line', Number, 5)
    this.option('stoch_k', 'Smoothing for making the Slow-K line. Usually set to 3', Number, 3)
    this.option(
      'stoch_k_ma_type',
      'Type of Moving Average for Slow-K : SMA,EMA,WMA,DEMA,TEMA,TRIMA,KAMA,MAMA,T3',
      String,
      'SMA'
    ),
      this.option('stoch_d', 'Smoothing for making the Slow-D line', Number, 3)
    this.option(
      'stoch_d_ma_type',
      'Type of Moving Average for Slow-D : SMA,EMA,WMA,DEMA,TEMA,TRIMA,KAMA,MAMA,T3',
      String,
      'SMA'
    ),
      this.option('stoch_k_sell', 'K must be above this before selling', Number, 70)
    this.option('stoch_k_buy', 'K must be below this before buying', Number, 30)

    this.option('bollinger_size', 'period size', Number, 14)
    this.option('bollinger_updev', '', Number, 2)
    this.option('bollinger_dndev', '', Number, 2)
    this.option('bollinger_dType', 'mode: : SMA,EMA,WMA,DEMA,TEMA,TRIMA,KAMA,MAMA,T3', String, 'SMA')
    this.option(
      'bollinger_upper_bound_pct',
      'pct the current price should be near the bollinger upper bound before we sell',
      Number,
      0
    )
    this.option(
      'bollinger_lower_bound_pct',
      'pct the current price should be near the bollinger lower bound before we buy',
      Number,
      0
    )
  },

  calculate(s) {
    if (s.in_preroll) return
  },

  onPeriod(s, cb) {
    // make sure we have all values
    if (s.in_preroll) return cb()
    taBollinger(
      s,
      'tabollinger',
      s.options.bollinger_size,
      s.options.bollinger_updev,
      s.options.bollinger_dndev,
      s.options.bollinger_dType
    )
      .then(function(inbol: Record<string, any>) {
        taStoch(
          s,
          'stoch',
          s.options.stoch_periods,
          s.options.stoch_k,
          s.options.stoch_k_ma_type,
          s.options.stoch_d,
          s.options.stoch_d_ma_type
        )
          .then(function(inres: Record<string, any>) {
            if (!inres) return cb()
            const divergent = inres.k[inres.k.length - 1] - inres.d[inres.k.length - 1]
            s.period.stoch_D = inres.d[inres.d.length - 1]
            s.period.stoch_K = inres.k[inres.k.length - 1]
            const last_divergent = inres.k[inres.k.length - 2] - inres.d[inres.d.length - 2]
            let _switch = 0
            const nextdivergent = (divergent + last_divergent) / 2 + (divergent - last_divergent)
            if (last_divergent <= 0 && divergent > 0) _switch = 1 // price rising
            if (last_divergent >= 0 && divergent < 0) _switch = -1 // price falling

            s.period.divergent = divergent
            s.period._switch = _switch

            const upperBound = inbol.outRealUpperBand[inbol.outRealUpperBand.length - 1]
            const lowerBound = inbol.outRealLowerBand[inbol.outRealLowerBand.length - 1]
            const midBound = inbol.outRealMiddleBand[inbol.outRealMiddleBand.length - 1]
            if (!s.period.bollinger) s.period.bollinger = {}

            s.period.bollinger.upperBound = upperBound
            s.period.bollinger.lowerBound = lowerBound
            s.period.bollinger.midBound = midBound

            // K is fast moving

            s.signal = null
            if (_switch != 0) {
              if (
                s.period.close >= midBound &&
                s.period.close >= (upperBound / 100) * (100 + s.options.bollinger_upper_bound_pct) &&
                nextdivergent < divergent &&
                _switch == -1 &&
                s.period.stoch_K > s.options.stoch_k_sell
              ) {
                s.signal = 'sell'
              } else if (
                s.period.close < (lowerBound / 100) * (100 + s.options.bollinger_lower_bound_pct) &&
                nextdivergent >= divergent &&
                _switch == 1 &&
                s.period.stoch_K < s.options.stoch_k_buy
              ) {
                s.signal = 'buy'
              }
            }

            cb()
          })
          .catch(function() {
            cb()
          })
      })
      .catch(function() {
        cb()
      })
  },

  onReport(s) {
    const cols = []
    if (s.period.bollinger) {
      if (s.period.bollinger.upperBound && s.period.bollinger.lowerBound) {
        const upperBound = s.period.bollinger.upperBound
        const lowerBound = s.period.bollinger.lowerBound
        let color = 'grey'
        if (s.period.close > (upperBound / 100) * (100 + s.options.bollinger_upper_bound_pct)) {
          color = 'green'
        }
        if (s.period.close < (lowerBound / 100) * (100 - s.options.bollinger_lower_bound_pct)) {
          color = 'red'
        }
        cols.push(z(8, n(s.period.close).format('+00.0000'), ' ')[color])
        cols.push(
          z(
            8,
            n(lowerBound)
              .format('0.000000')
              .substring(0, 7),
            ' '
          ).cyan
        )
        cols.push(
          z(
            8,
            n(upperBound)
              .format('0.000000')
              .substring(0, 7),
            ' '
          ).cyan
        )
        cols.push(
          z(
            8,
            n(s.period.stoch_D)
              .format('0.0000')
              .substring(0, 7),
            ' '
          ).cyan
        )
        cols.push(
          z(
            8,
            n(s.period.stoch_K)
              .format('0.0000')
              .substring(0, 7),
            ' '
          ).cyan
        )
        cols.push(
          z(
            5,
            n(s.period.divergent)
              .format('0')
              .substring(0, 7),
            ' '
          ).cyan
        )
        cols.push(
          z(
            2,
            n(s.period._switch)
              .format('0')
              .substring(0, 2),
            ' '
          ).cyan
        )
      }
    } else {
      cols.push('         ')
    }
    return cols
  },

  phenotypes: {
    // -- common
    period_length: phenotypes.listOption(['1m', '2m', '3m', '4m', '5m', '10m', '15m']), // , '10m','15m','30m','45m','60m'
    min_periods: phenotypes.range0(52, 150),
    markdown_buy_pct: phenotypes.rangeFactor(-1.0, 1.0, 0.1),
    markup_sell_pct: phenotypes.rangeFactor(-1.0, 1.0, 0.1),
    order_type: phenotypes.listOption(['maker', 'taker']),
    sell_stop_pct: phenotypes.rangeFactor(0.0, 50.0, 0.1),
    buy_stop_pct: phenotypes.rangeFactor(0.0, 50.0, 0.1),
    profit_stop_enable_pct: phenotypes.rangeFactor(0.0, 5.0, 0.1),
    profit_stop_pct: phenotypes.rangeFactor(0.0, 50.0, 0.1),

    // -- strategy
    rsi_periods: phenotypes.range0(10, 30),
    stoch_periods: phenotypes.range0(5, 30),
    stoch_k: phenotypes.range0(1, 10),
    stoch_k_ma_type: phenotypes.listOption(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'TRIMA', 'KAMA', 'MAMA', 'T3']),
    stoch_d: phenotypes.range0(1, 10),
    stoch_k_sell: phenotypes.rangeFactor(0.0, 100.0, 1.0),
    stoch_k_buy: phenotypes.rangeFactor(0.0, 100.0, 1.0),
    stoch_d_ma_type: phenotypes.listOption(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'TRIMA', 'KAMA', 'MAMA', 'T3']),

    bollinger_size: phenotypes.rangeFactor(10, 25, 1),
    bollinger_updev: phenotypes.rangeFactor(1, 3.0, 0.1),
    bollinger_dndev: phenotypes.rangeFactor(1, 3.0, 0.1),
    bollinger_dType: phenotypes.listOption(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'TRIMA', 'KAMA', 'MAMA', 'T3']),
    bollinger_upper_bound_pct: phenotypes.rangeFactor(0.0, 100.0, 1.0),
    bollinger_lower_bound_pct: phenotypes.rangeFactor(0.0, 100.0, 1.0),
  },
}

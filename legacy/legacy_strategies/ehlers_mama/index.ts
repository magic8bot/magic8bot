/*
                    ======= Ehlers MESA Adaptive Moving Average =======

Developed by John Ehlers, the MESA Adaptive Moving Average is a technical trend-following indicator which,
according to its creator, adapts to price movement “based on the rate change of phase as measured by the
Hilbert Transform Discriminator”. This method of adaptation features a fast and a slow moving average so
that the composite moving average swiftly responds to price changes and holds the average value until the
next bar’s close. Ehlers states that because the average’s fallback is slow, you can create trading systems
with almost whipsaw-free trades.

Basically the indicator looks like two moving averages, but instead of curving around the price action,
the MESA Adaptive MA moves in a staircase manner as the price ratchets. It produces two outputs, MAMA and FAMA.
FAMA (Following Adaptive Moving Average) is a result of MAMA being applied to the first MAMA line. The FAMA
is synchronized in time with MAMA, but its vertical movement comes with a lag. Thus, the two don’t cross unless
a major change in market direction occurs, resulting in a moving average crossover system which is “virtually
free of whipsaw trades”, according to Ehlers.

If you appreciate the work and the man hours that went into creating this strategy, please consider giving back.

LoneWolf345 ETH = 0xa42f6d21f1e52f7fbaeaa0f58d1cc4b9a58f2dcc , BTC = 15L8QstCQG4ho6139hVaqLxkAzcjnqBbf6
Travis      ETH = 0xdA963A127BeCB08227583d11f912F400D5347060 , BTC = 3KKHdBJpEGxghxGazoE4X7ihyr2q6nHUvW

*/

import z from 'zero-fill'
import n from 'numbro'
import { phenotypes } from '@util'
import { crossover, crossunder, nz, iff } from '@util'
import * as tv from '../../../util/helpers'

export default {
  description: 'Ehlers MESA Adaptive Moving Average',
  name: 'Ehlers MAMA',

  getOptions() {
    this.option('period', 'period length eg 10m', String, '60m')
    this.option('min_periods', 'min. number of history periods', Number, 6)

    // this.option('mama_periods', '', Number, 5)
    this.option('mama_fastlimit', '', Number, 0.5)
    this.option('mama_slowlimit', '', Number, 0.09)
    this.option('price_source', '', String, 'HAohlc4')
  },

  calculate() {
    //
  },

  onPeriod(s, cb) {
    if (!s.mama) {
      s.mama = {
        dt: [],
        fama: [],
        i1: [],
        i2: [],
        im: [],
        mama: [],
        p: [],
        p1: [],
        p3: [],
        phase: [],
        q1: [],
        q2: [],
        re: [],
        sp: [],
        spp: [],
        src: [],
      }
    }

    if (s.lookback.length > s.options.min_periods) {
      if (!s.options.price_source || s.options.price_source === 'close') {
        s.mama.src.unshift(s.period.close)
      } else if (s.options.price_source === 'hl2') {
        s.mama.src.unshift(tv.hl2(s.period))
      } else if (s.options.price_source === 'hlc3') {
        s.mama.src.unshift(tv.hlc3(s.period))
      } else if (s.options.price_source === 'ohlc4') {
        s.mama.src.unshift(tv.ohlc4(s.period))
      } else if (s.options.price_source === 'HAohlc4') {
        s.mama.src.unshift(tv.hAohlc4(s))
      }

      // s.mama.src.unshift((s.period.high + s.period.low) / 2)
      s.mama.sp.unshift((4 * s.mama.src[0] + 3 * s.mama.src[1] + 2 * s.mama.src[2] + s.mama.src[3]) / 10.0)
      s.mama.dt.unshift(
        (0.0962 * s.mama.sp[0] + 0.5769 * nz(s.mama.sp[2]) - 0.5769 * nz(s.mama.sp[4]) - 0.0962 * nz(s.mama.sp[6])) *
          (0.075 * nz(s.mama.p[0]) + 0.54)
      )
      s.mama.q1.unshift(
        (0.0962 * s.mama.dt[0] + 0.5769 * nz(s.mama.dt[2]) - 0.5769 * nz(s.mama.dt[4]) - 0.0962 * nz(s.mama.dt[6])) *
          (0.075 * nz(s.mama.p[0]) + 0.54)
      )
      s.mama.i1.unshift(nz(s.mama.dt[3]))
      const jI =
        (0.0962 * s.mama.i1[0] + 0.5769 * nz(s.mama.i1[2]) - 0.5769 * nz(s.mama.i1[4]) - 0.0962 * nz(s.mama.i1[6])) *
        (0.075 * nz(s.mama.p[0]) + 0.54)
      const jq =
        (0.0962 * s.mama.q1[0] + 0.5769 * nz(s.mama.q1[2]) - 0.5769 * nz(s.mama.q1[4]) - 0.0962 * nz(s.mama.q1[6])) *
        (0.075 * nz(s.mama.p[0]) + 0.54)
      const i2_ = s.mama.i1[0] - jq
      const q2_ = s.mama.q1[0] + jI
      s.mama.i2.unshift(0.2 * i2_ + 0.8 * nz(s.mama.i2[0]))
      s.mama.q2.unshift(0.2 * q2_ + 0.8 * nz(s.mama.q2[0]))
      const re_ = s.mama.i2[0] * nz(s.mama.i2[1]) + s.mama.q2[0] * nz(s.mama.q2[1])
      const im_ = s.mama.i2[0] * nz(s.mama.q2[1]) - s.mama.q2[0] * nz(s.mama.i2[1])
      s.mama.re.unshift(0.2 * re_ + 0.8 * nz(s.mama.re[0]))
      s.mama.im.unshift(0.2 * im_ + 0.8 * nz(s.mama.im[0]))
      s.mama.p1.unshift(
        iff(s.mama.im[0] != 0 && s.mama.re[0] != 0, 360 / Math.atan(s.mama.im[0] / s.mama.re[0]), nz(s.mama.p[0]))
      )
      const p2 = iff(
        s.mama.p1[0] > 1.5 * nz(s.mama.p1[1]),
        1.5 * nz(s.mama.p1[1]),
        iff(s.mama.p1[0] < 0.67 * nz(s.mama.p1[1]), 0.67 * nz(s.mama.p1[1]), s.mama.p1[0])
      )
      s.mama.p3.unshift(iff(p2 < 6, 6, iff(p2 > 50, 50, p2)))
      s.mama.p.unshift(0.2 * s.mama.p3[0] + 0.8 * nz(s.mama.p3[1]))
      s.mama.spp.unshift(0.33 * s.mama.p[0] + 0.67 * nz(s.mama.spp[0]))
      s.mama.phase.unshift(Math.atan(s.mama.q1[0] / s.mama.i1[0]))
      const dphase_ = nz(s.mama.phase[1]) - s.mama.phase[0]
      const dphase = iff(dphase_ < 1, 1, dphase_)
      const alpha_ = s.options.mama_fastlimit / dphase
      const alpha = iff(
        alpha_ < s.options.mama_slowlimit,
        s.options.mama_slowlimit,
        iff(alpha_ > s.options.mama_fastlimit, s.options.mama_fastlimit, alpha_)
      )
      s.mama.mama.unshift(alpha * s.mama.src[0] + (1 - alpha) * nz(s.mama.mama[0]))
      s.mama.fama.unshift(0.5 * alpha * s.mama.mama[0] + (1 - 0.5 * alpha) * nz(s.mama.fama[0]))

      s.period.mama = s.mama.mama[0]
      if (s.options.debug) {
        console.log('s.mama.mama: ' + s.mama.mama[0])
      }
      s.period.fama = s.mama.fama[0]

      if (s.mama.src.length > 7) {
        Object.keys(s.mama).forEach((k) => {
          s.mama[k].pop()
        })
      }

      if (!s.in_preroll) {
        if (crossover(s, 'mama', 'fama')) s.signal = 'buy'
        else if (crossunder(s, 'mama', 'fama')) s.signal = 'sell'
        else s.signal = null
      }
    }
    cb()
  },

  onReport(s) {
    const cols = []
    let color = 'cyan'
    const FamaMamaDelta = ((s.period.mama - s.period.fama) / s.period.mama) * 100

    if (s.period.fama < s.period.mama) {
      color = 'green'
    } else if (s.period.fama > s.period.mama) {
      color = 'red'
    }

    cols.push(z(10, '[' + n(FamaMamaDelta).format('#00.##') + '%]', '')[color])

    cols.push(z(10, 'M[' + n(s.period.mama).format('###.0') + ']', '')[color])
    cols.push(z(10, ' F[' + n(s.period.fama).format('###.0') + ']', '')[color])

    return cols
  },

  phenotypes: {
    // General Options
    period_length: phenotypes.rangePeriod(5, 240, 'm'),
    min_periods: phenotypes.range0(10, 10),
    markdown_buy_pct: phenotypes.rangeFloat(0, 0),
    markup_sell_pct: phenotypes.rangeFloat(0, 0),
    order_type: phenotypes.listOption(['maker', 'taker']),
    sell_stop_pct: phenotypes.range1(1, 50),
    buy_stop_pct: phenotypes.range1(1, 50),
    profit_stop_enable_pct: phenotypes.range0(1, 20),
    profit_stop_pct: phenotypes.range0(1, 10),

    // Strategy Specific
    mama_fastlimit: phenotypes.rangeFactor(0.1, 0.9, 0.1),
    mama_slow_limit: phenotypes.rangeFactor(0.01, 0.09, 0.01),
    price_source: phenotypes.listOption(['hl2', 'hlc3', 'ohlc4', 'HAohlc4']),
  },
}

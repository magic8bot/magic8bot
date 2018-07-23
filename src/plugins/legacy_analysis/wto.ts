export const wto = (s, key, length, sourceKey?) => {
  if (!sourceKey) sourceKey = 'close'

  const ema = (x, y, p) => {
    const alpha = 2 / (y + 1)
    return (x - p) * alpha + p
  }

  if (!s.period.wto_d) s.period.wto_d = 0
  if (!s.period.wto_esa) s.period.wto_esa = 0
  if (!s.period[key]) s.period[key] = 0

  if (s.lookback.length >= length) {
    const ap = (s.period.close + s.period.high + s.period.low) / 3
    s.period.hcl3 = ap

    const prevEsa = s.lookback[0].wto_esa
    if (typeof prevEsa !== 'undefined' && !isNaN(prevEsa)) {
      const esa = ema(ap, length, prevEsa)
      s.period.wto_esa = esa

      const prevD = s.lookback[0].wto_d
      if (typeof prevD !== 'undefined' && !isNaN(prevD)) {
        const d = ema(Math.abs(ap - esa), length, prevD)
        s.period.wto_d = d

        const ci = (ap - esa) / (0.015 * d)

        const prevTci = s.lookback[0][key]
        if (typeof prevTci !== 'undefined' && !isNaN(prevTci)) {
          const tci = ema(ci, s.options.wavetrend_average_length, prevTci)
          s.period[key] = tci
        }
      }
    }
  }
}

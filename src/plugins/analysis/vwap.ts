export const vwap = (s, key, length, maxPeriod, sourceKey?) => {
  if (!sourceKey) sourceKey = 'close'

  if (s.lookback.length >= length) {
    if (!s.vwap) {
      s.vwap = 0
      s.vwapMultiplier = 0
      s.vwapDivider = 0
      s.vwapCount = 0
    }

    if (maxPeriod && s.vwapCount > maxPeriod) {
      s.vwap = 0
      s.vwapMultiplier = 0
      s.vwapDivider = 0
      s.vwapCount = 0
    }

    s.vwapMultiplier = s.vwapMultiplier + parseFloat(s.period[sourceKey]) * parseFloat(s.period.volume)
    s.vwapDivider = s.vwapDivider + parseFloat(s.period.volume)

    s.period[key] = s.vwap = s.vwapMultiplier / s.vwapDivider

    s.vwapCount++
  }
}

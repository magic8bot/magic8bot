export const ema = (s, key, length, sourceKey?) => {
  if (!sourceKey) sourceKey = 'close'
  if (s.lookback.length >= length) {
    let prevEma = s.lookback[0][key]
    if (typeof prevEma === 'undefined' || isNaN(prevEma)) {
      let sum = 0
      s.lookback.slice(0, length).forEach((period) => {
        sum += period[sourceKey]
      })
      prevEma = sum / length
    }
    const multiplier = 2 / (length + 1)
    s.period[key] = (s.period[sourceKey] - prevEma) * multiplier + prevEma
  }
}

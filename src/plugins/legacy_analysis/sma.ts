export const sma = (s, key, length, sourceKey?) => {
  if (!sourceKey) sourceKey = 'close'
  if (s.lookback.length >= length) {
    const SMA = s.lookback.slice(0, length).reduce((sum, cur) => {
      return sum + cur[sourceKey]
    }, 0)

    s.period[key] = SMA / length
  }
}

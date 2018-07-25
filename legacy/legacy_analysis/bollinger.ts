// Bollinger Bands
import bollingerbands from 'bollinger-bands'

export const bollinger = (s, key, length, sourceKey?) => {
  if (!sourceKey) sourceKey = 'close'
  if (s.lookback.length > length) {
    const data = []
    for (let i = length - 1; i >= 0; i--) {
      data.push(s.lookback[i][sourceKey])
    }
    const result = bollingerbands(data, length, s.options.bollinger_time)
    s.period[key] = result
  }
}

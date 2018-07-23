// Keltner Channels
import * as keltnerchannel from 'keltnerchannel'

export const kc = (s, key, length, sourceKey?) => {
  if (!sourceKey) sourceKey = 'close'
  if (s.lookback.length > length) {
    const data = []
    for (let i = length - 1; i >= 0; i--) {
      data.push({
        close: s.lookback[i].close,
        high: s.lookback[i].high,
        low: s.lookback[i].low,
      })
    }
    const result = keltnerchannel.kc(data, s.options.kc_size, s.options.kc_multiplier)
    s.period[key] = result
  }
}

const precisionRound = (num, precision) => {
  const factor = Math.pow(10, precision)
  return Math.round(num * factor) / factor
}
export const rsi = (s, key, length) => {
  if (s.lookback.length >= length) {
    const avgGain = s.lookback[0][key + '_avg_gain']
    const avgLoss = s.lookback[0][key + '_avg_loss']
    if (typeof avgGain === 'undefined') {
      let gainSum = 0
      let lossSum = 0
      let lastClose
      s.lookback.slice(0, length).forEach((period) => {
        if (lastClose) {
          if (period.close > lastClose) {
            gainSum += period.close - lastClose
          } else {
            lossSum += lastClose - period.close
          }
        }
        lastClose = period.close
      })
      s.period[key + '_avg_gain'] = gainSum / length
      s.period[key + '_avg_loss'] = lossSum / length
    } else {
      const currentGain = s.period.close - s.lookback[0].close
      s.period[key + '_avg_gain'] = (avgGain * (length - 1) + (currentGain > 0 ? currentGain : 0)) / length
      const currentLoss = s.lookback[0].close - s.period.close
      s.period[key + '_avg_loss'] = (avgLoss * (length - 1) + (currentLoss > 0 ? currentLoss : 0)) / length
    }

    if (s.period[key + '_avg_loss'] === 0) {
      s.period[key] = 100
    } else {
      const rs = s.period[key + '_avg_gain'] / s.period[key + '_avg_loss']
      s.period[key] = precisionRound(100 - 100 / (1 + rs), 2)
    }
  }
}

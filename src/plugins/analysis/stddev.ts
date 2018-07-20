export const stddev = (s, key, length, sourceKey) => {
  if (typeof s.period[sourceKey] === 'number') {
    let sum = s.period[sourceKey]
    let sumLen = 1
    for (let idx = 0; idx < length; idx++) {
      if (typeof s.lookback[idx][sourceKey] === 'number') {
        sum += s.lookback[idx][sourceKey]
        sumLen++
      } else {
        break
      }
    }
    const avg = sum / sumLen
    let varSum = 0
    for (let idx = 0; idx < sumLen - 1; idx++) {
      varSum += Math.pow(s.lookback[idx][sourceKey] - avg, 2)
    }
    const variance = varSum / sumLen
    s.period[key] = Math.sqrt(variance)
  }
}

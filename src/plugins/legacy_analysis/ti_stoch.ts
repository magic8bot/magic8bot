import tulind from 'tulind'

export const tiStoch = (s, key, kPeriods, skPeriods, dPeriods, optMarket?) => {
  return new Promise((resolve, reject) => {
    if (s.lookback.length >= Math.max(kPeriods, dPeriods, skPeriods)) {
      // dont calculate until we have enough data
      let tmpMarket = optMarket
      if (!tmpMarket) {
        tmpMarket = s.lookback.slice(0, 1000)
        tmpMarket.reverse()
        // add current period
        tmpMarket.push(s.period)
      }

      const tmpMarketHigh = tmpMarket.map((x) => x.high)
      const tmpMarketClose = tmpMarket.map((x) => x.close)
      const tmpMarketLow = tmpMarket.map((x) => x.low)
      // addCurrentPeriod

      tulind.indicators.stoch.indicator(
        [tmpMarketHigh, tmpMarketLow, tmpMarketClose],
        [kPeriods, skPeriods, dPeriods],
        (err, result) => {
          if (err) {
            console.log(err)
            reject(err)
            return
          }

          resolve({
            d: result[1],
            k: result[0],
          })
        }
      )
    } else {
      resolve()
    }
  })
}

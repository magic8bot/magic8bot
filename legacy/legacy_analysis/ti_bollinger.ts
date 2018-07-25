import tulind from 'tulind'

export const tiBollinger = (s, key, rsiPeriods, stdDev, optMarket?) => {
  return new Promise((resolve, reject) => {
    // dont calculate until we have enough data

    let tmpMarket = optMarket
    if (!tmpMarket) {
      tmpMarket = s.lookback.slice(0, 1000).map((x) => x.close)
      tmpMarket.reverse()
      // add current period
      tmpMarket.push(s.period.close)
    } else {
      tmpMarket = tmpMarket.map((x) => x.close)
    }
    if (tmpMarket.length >= rsiPeriods) {
      // doublecheck length.
      if (tmpMarket.length >= rsiPeriods) {
        // extract int from string input for ma_type

        tulind.indicators.bbands.indicator([tmpMarket], [rsiPeriods, stdDev], (err, result) => {
          if (err) {
            console.log(err)
            reject(err)
            return
          }

          resolve({
            LowerBand: result[0],
            MiddleBand: result[1],
            UpperBand: result[2],
          })
        })
      } else {
        reject('MarketLenth not populated enough')
      }
    } else {
      reject('MarketLenth not populated enough')
    }
  })
}

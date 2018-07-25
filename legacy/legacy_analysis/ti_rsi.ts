import tulind from 'tulind'

export const tiRsi = (s, key, rsiPeriod, optMarket) => {
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

    if (tmpMarket.length >= rsiPeriod) {
      // doublecheck length.
      if (tmpMarket.length >= rsiPeriod) {
        // extract int from string input for ma_type

        tulind.indicators.rsi.indicator([tmpMarket], [rsiPeriod], (err, result) => {
          if (err) {
            console.log(err)
            reject(err)
            return
          }
          resolve({
            rsi: result[0],
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

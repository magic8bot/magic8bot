import tulind from 'tulind'

export const tiStochRsi = (s, key, rsiPeriod, kPeriods, dPeriods, optMarket) => {
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
          const trsi = result[0]
          // 0 oldest -- end newest
          trsi.reverse()
          const stochRSI = []

          for (let i = 0; i < kPeriods + dPeriods - 1; i++) {
            const rsiForPeriod = trsi.slice(i, rsiPeriod + i)
            const highestRSI = Math.max(...rsiForPeriod)
            const lowestRSI = Math.min(...rsiForPeriod)

            if (highestRSI === lowestRSI) {
              stochRSI.push(0)
            } else {
              stochRSI.push((trsi[rsiPeriod - 1 + i] - lowestRSI) / (highestRSI - lowestRSI))
            }
          }

          const percentK = []
          for (let i = 0; i < kPeriods; i++) {
            const kData = stochRSI.slice(i, kPeriods + i)
            if (kData.length === kPeriods) {
              percentK.push(kData.reduce((a, b) => a + b, 0) / kData.length)
            }
          }

          const percentD = []
          for (let i = 0; i < dPeriods; i++) {
            const dData = stochRSI.slice(i, dPeriods + i)
            if (dData.length === dPeriods) {
              percentD.push(dData.reduce((a, b) => a + b, 0) / dData.length)
            }
          }

          resolve({
            stochRSI,
            stochd: percentD,
            stochk: percentK,
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

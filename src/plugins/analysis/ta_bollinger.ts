import { getMaTypeFromString } from '@util'
const talib = require('talib')

export const taBollinger = (s, key, rsiPeriods, devUp, devDn, dMaType) => {
  return new Promise((resolve, reject) => {
    // dont calculate until we have enough data
    if (s.lookback.length >= rsiPeriods) {
      const tmpMarket = s.lookback.slice(0, 1000).map((x) => x.close)
      tmpMarket.reverse()
      // add current period
      tmpMarket.push(s.period.close)

      // doublecheck length.
      if (tmpMarket.length >= rsiPeriods) {
        // extract int from string input for ma_type
        const optInMAType = getMaTypeFromString(dMaType)
        talib.execute(
          {
            endIdx: tmpMarket.length - 1,
            inReal: tmpMarket,
            name: 'BBANDS',
            optInMAType, // "Type of Moving Average" default 0
            optInNbDevDn: devDn, // "Deviation multiplier for lower band" Real Default 2
            optInNbDevUp: devUp, // "Deviation multiplier for upper band" Real Default 2
            optInTimePeriod: rsiPeriods, // RSI 14 default
            startIdx: tmpMarket.length - 1,
          },
          (err, result) => {
            if (err) {
              console.log(err)
              reject(err)
              return
            }

            resolve({
              outRealLowerBand: result.result.outRealLowerBand,
              outRealMiddleBand: result.result.outRealMiddleBand,
              outRealUpperBand: result.result.outRealUpperBand,
            })
          }
        )
      } else {
        reject('MarketLenth not populated enough')
      }
    } else {
      reject('MarketLenth not populated enough')
    }
  })
}

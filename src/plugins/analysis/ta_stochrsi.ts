import { getMaTypeFromString } from '@util'
const talib = require('talib')

export const taStochrsi = (s, key, rsiPeriods, kPeriods, dPeriods, dMaType, optMarket?) => {
  return new Promise((resolve, reject) => {
    // Returns the parameters needed to execute left comment for latter reference
    // var o = talib.explain('STOCHRSI')

    let tmpMarket = optMarket
    if (!tmpMarket) {
      tmpMarket = s.lookback.slice(0, 1000).map((x) => x.close)
      tmpMarket.reverse()
      // add current period
      tmpMarket.push(s.period.close)
    } else {
      tmpMarket = tmpMarket.map((x) => x.close)
    }

    // dont calculate until we have enough data
    if (tmpMarket.length > rsiPeriods) {
      // doublecheck length.
      if (tmpMarket.length >= rsiPeriods) {
        // extract int from string input for ma_type
        const optInMAType = getMaTypeFromString(dMaType)
        talib.execute(
          {
            endIdx: tmpMarket.length - 1,
            inReal: tmpMarket,
            name: 'STOCHRSI',
            optInFastD_MAType: optInMAType, // type of Fast D default 0
            optInFastD_Period: dPeriods, // D 3 default
            optInFastK_Period: kPeriods, // K 5 default
            optInTimePeriod: rsiPeriods, // RSI 14 default
            startIdx: 0,
          },
          (err, result) => {
            if (err) {
              console.log(err)
              reject(err)
              return
            }

            resolve({
              outFastD: result.result.outFastD,
              outFastK: result.result.outFastK,
            })
          }
        )
      } else {
        resolve()
      }
    } else {
      resolve()
    }
  })
}

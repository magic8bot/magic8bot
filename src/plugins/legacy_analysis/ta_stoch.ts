import { getMaTypeFromString } from '@util'
const talib = require('talib')

export const taStoch = (s, key, kPeriods, skPeriods, kMaType, dPeriods, dMaType, optMarket?) => {
  return new Promise((resolve, reject) => {
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

    if (tmpMarket.length >= Math.max(kPeriods, dPeriods, skPeriods)) {
      const optInSlowDMAType = getMaTypeFromString(dMaType)
      const optInSlowKMAType = getMaTypeFromString(kMaType)
      talib.execute(
        {
          close: tmpMarketClose,
          endIdx: tmpMarketClose.length - 1,
          high: tmpMarketHigh,
          low: tmpMarketLow,
          name: 'STOCH',
          optInFastK_Period: kPeriods, // K 5 default
          optInSlowD_MAType: optInSlowDMAType, // type of Fast D default 0
          optInSlowD_Period: dPeriods, // D 3 default
          optInSlowK_MAType: optInSlowKMAType, // Slow K maType default 0
          optInSlowK_Period: skPeriods, // Slow K 3 default
          startIdx: 0,
        },
        (err, result) => {
          if (err) {
            console.log(err)
            reject(err)
            return
          }

          resolve({
            d: result.result.outSlowD,
            k: result.result.outSlowK,
          })
        }
      )
    } else {
      resolve()
    }
  })
}

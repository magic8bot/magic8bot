import { getMaTypeFromString } from '@util'
const talib = require('talib')

export const taPpo = (s, slowPeriod, fastPeriod, signalPeriod, maType) => {
  return new Promise((resolve, reject) => {
    // create object for talib. only close is used for now but rest might come in handy
    if (!s.marketData) {
      s.marketData = { open: [], close: [], high: [], low: [], volume: [] }
    }

    if (s.lookback.length > s.marketData.close.length) {
      for (let i = s.lookback.length - s.marketData.close.length - 1; i >= 0; i--) {
        s.marketData.close.push(s.lookback[i].close)
      }
    }

    // dont calculate until we have enough data
    const periodsNecessary = slowPeriod + signalPeriod - 1

    if (s.marketData.close.length < periodsNecessary) {
      resolve()
      return
    }

    const tmpMarket = s.marketData.close.slice()

    // add current period
    tmpMarket.push(s.period.close)

    // extract int from string input for ma_type
    const optInMAType = getMaTypeFromString(maType)

    talib.execute(
      {
        endIdx: tmpMarket.length - 1,
        inReal: tmpMarket,
        name: 'PPO',
        optInFastPeriod: fastPeriod,
        optInMAType,
        optInSignalPeriod: signalPeriod,
        optInSlowPeriod: slowPeriod,
        startIdx: 0,
      },
      (err, result) => {
        if (err) {
          reject(err)
          return
        }

        resolve(result.result.outReal[result.nbElement - 1])
      }
    )
  })
}

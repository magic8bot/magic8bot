// tablib: WILLR - Williams' %R https://mrjbq7.github.io/ta-lib/func_groups/momentum_indicators.html

const talib = require('talib')

export const taWillr = (s, minPeriods, timeperiod) => {
  return new Promise((resolve, reject) => {
    // create object for talib. only close is used for now but rest might come in handy
    if (!s.marketData) {
      s.marketData = { open: [], close: [], high: [], low: [], volume: [] }
    }

    if (s.lookback.length > s.marketData.close.length) {
      for (let i = s.lookback.length - s.marketData.close.length - 1; i >= 0; i--) {
        s.marketData.high.push(s.lookback[i].high)
        s.marketData.low.push(s.lookback[i].low)
        s.marketData.close.push(s.lookback[i].close)
        s.marketData.volume.push(s.lookback[i].volume)
      }
    }

    if (s.marketData.close.length < minPeriods) {
      resolve()
      return
    }

    const tmpHigh = s.marketData.high.slice()
    tmpHigh.push(s.period.high)

    const tmpLow = s.marketData.low.slice()
    tmpLow.push(s.period.low)

    const tmpClose = s.marketData.close.slice()
    tmpClose.push(s.period.close)

    const tmpVolume = s.marketData.volume.slice()
    tmpVolume.push(s.period.volume)

    talib.execute(
      {
        close: tmpClose,
        endIdx: tmpHigh.length - 1,
        high: tmpHigh,
        low: tmpLow,
        name: 'WILLR',
        optInTimePeriod: timeperiod || 14,
        startIdx: 0,
      },
      (err, result) => {
        if (err) {
          console.log(err)
          reject(err)
          return
        }

        resolve(result.result.outReal[result.nbElement - 1])
      }
    )
  })
}

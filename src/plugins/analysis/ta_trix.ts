const talib = require('talib')

export const taTrix = (s, timeperiod) => {
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

    if (s.marketData.close.length < timeperiod) {
      resolve()
      return
    }

    const tmpMarket = s.marketData.close.slice()

    // add current period
    tmpMarket.push(s.period.close)

    talib.execute(
      {
        endIdx: tmpMarket.length - 1,
        inReal: tmpMarket,
        name: 'TRIX',
        optInTimePeriod: timeperiod,
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

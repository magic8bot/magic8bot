const talib = require('talib')

export const taMacd = (s, slowPeriod, fastPeriod, signalPeriod) => {
  return new Promise((resolve, reject) => {
    // check parameters
    // if (fast_period > slow_period) {
    //   console.log('incorrect parameters MACD. (fast_period < slow_period || signal_period > fast_period)')
    //   return;
    // }

    // create object for talib. only close is used for now but rest might come in handy
    if (!s.marketData) {
      s.marketData = { open: [], close: [], high: [], low: [], volume: [] }
    }
    if (s.lookback.length > s.marketData.close.length) {
      for (let i = s.lookback.length - s.marketData.close.length - 1; i >= 0; i--) {
        s.marketData.close.push(s.lookback[i].close)
      }
    }

    const periodsNecessary = slowPeriod + signalPeriod - 1
    // dont calculate until we have enough data

    if (s.marketData.close.length >= periodsNecessary) {
      // fillup marketData for talib.
      const tmpMarket = s.marketData.close.slice()

      // add current period
      tmpMarket.push(s.period.close)

      talib.execute(
        {
          endIdx: tmpMarket.length - 1,
          inReal: tmpMarket,
          name: 'MACD',
          optInFastPeriod: fastPeriod,
          optInSignalPeriod: signalPeriod,
          optInSlowPeriod: slowPeriod,
          startIdx: 0,
        },
        (err, result) => {
          if (err) {
            reject(err)
            console.log(err)
            return
          }
          // Result format: (note: outReal  can have multiple items in the array)
          // {
          //   begIndex: 8,
          //   nbElement: 1,
          //   result: { outReal: [ 1820.8621111111108 ] }
          // }
          resolve({
            macd: result.result.outMACD[result.nbElement - 1],
            macd_histogram: result.result.outMACDHist[result.nbElement - 1],
            macd_signal: result.result.outMACDSignal[result.nbElement - 1],
          })
        }
      )
    } else {
      resolve()
    }
  })
}

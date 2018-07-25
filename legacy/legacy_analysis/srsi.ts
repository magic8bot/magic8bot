import mathjs from 'mathjs'
import { rsi } from './rsi'

export const srsi = (s, key, rsiPeriods, kPeriods, dPeriods) => {
  const samplesRequiredForStochRSI = rsiPeriods + kPeriods + 1

  if (s.lookback.length >= samplesRequiredForStochRSI - 1) {
    const RSI = []

    if (typeof s.period.rsi !== 'undefined') {
      RSI.push(s.period.rsi)
    } else {
      rsi(s, 'rsi', rsiPeriods)
      RSI.push(s.period.rsi)
    }

    s.lookback.slice(0, samplesRequiredForStochRSI - 1).forEach((period) => {
      if (period.rsi) {
        RSI.push(period.rsi)
      }
    })

    RSI.reverse()

    if (RSI.length >= samplesRequiredForStochRSI) {
      const stochRSI = []
      for (let i = 0; i < kPeriods + dPeriods - 1; i++) {
        const rsiForPeriod = RSI.slice(i, rsiPeriods + i)
        const highestRSI = Math.max(...rsiForPeriod)
        const lowestRSI = Math.min(...rsiForPeriod)
        if (highestRSI === lowestRSI) {
          stochRSI.push(0)
        } else {
          stochRSI.push(((RSI[rsiPeriods - 1 + i] - lowestRSI) / (highestRSI - lowestRSI)) * 100)
        }
      }

      stochRSI.reverse()

      const percentK = []
      for (let i = 0; i < kPeriods; i++) {
        const kData = stochRSI.slice(i, kPeriods + i)
        if (kData.length === kPeriods) {
          percentK.push(mathjs.mean(kData))
        }
      }

      const percentD = []
      for (let i = 0; i < dPeriods; i++) {
        const dData = percentK.slice(i, dPeriods + i)
        if (dData.length === dPeriods) {
          percentD.push(mathjs.mean(dData))
        }
      }

      s.period[key + '_K'] = percentK[0] === 0 ? 0 : mathjs.round(percentK[0], 2)
      s.period[key + '_D'] = percentD[0] === 0 ? 0 : mathjs.round(percentD[0], 2)

      // console.log('lib.srsi: For RSI', RSI[RSI.length - 1],
      // '-', '%K is', s.period[key + '_K'], ', %D is', s.period[key + '_D'], ', period info', s.period);
    }
  }
}

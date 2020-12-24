import { precisionRound } from '@util'
import { PeriodItem } from '@m8bTypes'

export class RSI {
  public static calculate(lastAvgGain: number, lastAvgLoss: number, periods: PeriodItem[], length: number) {
    const { avgGain, avgLoss } = RSI.getAvgGainLoss(lastAvgGain, lastAvgLoss, periods, length)

    const rsi = avgLoss === 0 ? 100 : precisionRound(100 - 100 / (1 + avgGain / avgLoss), 2)

    return { avgGain, avgLoss, rsi }
  }

  public static getAvgGainLoss(lastAvgGain: number, lastAvgLoss: number, periods: PeriodItem[], length: number) {
    if (!lastAvgGain) {
      const { gain, loss } = RSI.getSums(periods, length)
      return {
        avgGain: gain / length,
        avgLoss: loss / length,
      }
    }

    const [{ close }, { close: prevClose }] = periods
    const currentGain = close - prevClose
    const currentLoss = prevClose - close

    const avgGain = (lastAvgGain * (length - 1) + (currentGain > 0 ? currentGain : 0)) / length
    const avgLoss = (lastAvgLoss * (length - 1) + (currentLoss > 0 ? currentLoss : 0)) / length

    return { avgGain, avgLoss }
  }

  public static getSums(periods: PeriodItem[], length: number) {
    return periods
      .slice(0, length + 1)
      .reverse()
      .reduce(
        ({ last, gain, loss }, { close }) => {
          if (!last) return { last: close, gain, loss }
          const g = close - last
          const l = last - close
          return {
            last: close,
            gain: (g > 0 ? g : 0) + gain,
            loss: (l > 0 ? l : 0) + loss,
          }
        },
        { last: 0, gain: 0, loss: 0 }
      )
  }
}

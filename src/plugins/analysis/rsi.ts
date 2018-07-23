import { precisionRound } from '@util'
import { PeriodItem } from '@lib'

export class RSI {
  public static calculate(lastAvgGain: number, lastAvgLoss: number, periods: PeriodItem[], length: number) {
    const { avgGain, avgLoss } = RSI.getAvgGainLoss(lastAvgGain, lastAvgLoss, periods, length)

    const rsi = avgLoss === 0 ? 100 : precisionRound(100 - 100 / (1 + avgGain / avgLoss), 2)

    return { avgGain, avgLoss, rsi }
  }

  private static getAvgGainLoss(lastAvgGain: number, lastAvgLoss: number, periods: PeriodItem[], length: number) {
    if (!lastAvgGain) {
      const { gain, loss } = RSI.getSums(periods, length)
      return { avgGain: gain / length, avgLoss: loss / length }
    }

    const [{ close }, { close: prevClose }] = periods
    const currentGain = close - prevClose
    const currentLoss = prevClose - close

    const avgGain = (lastAvgGain * (length - 1) + (currentGain > 0 ? currentGain : 0)) / length
    const avgLoss = (lastAvgLoss * (length - 1) + (currentLoss > 0 ? currentLoss : 0)) / length

    return { avgGain, avgLoss }
  }

  private static getSums(periods: PeriodItem[], length: number) {
    return periods.slice(1, length + 1).reduce(
      ({ last, gain, loss }, { close }) => {
        if (!last) return { last: close, gain, loss }
        return { last: close, gain: close - last, loss: last - close }
      },
      { last: 0, gain: 0, loss: 0 }
    )
  }
}

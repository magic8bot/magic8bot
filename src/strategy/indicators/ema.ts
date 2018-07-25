import { SMA } from './sma'

export class EMA {
  public static calculate(prevEma: number, periods: Record<string, number>[], length: number, source = 'close') {
    const [period] = periods
    if (periods.length <= length) return null

    if (!prevEma) return SMA.calculate(periods, length, source)

    const smoothing = 2 / (length + 1)
    return smoothing * (period[source] - prevEma) + prevEma
  }
}
